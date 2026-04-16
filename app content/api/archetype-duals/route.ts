import { NextResponse } from 'next/server';
import { compareArchetypes } from '@/lib/bigfive/archetypeDuality';
import type { GZProfile, DomainProfile, DomainKey } from '@/lib/bigfive/types';
import { sha256 } from '@/lib/crypto/sha256';

export const dynamic = 'force-dynamic';

async function loadFullProfile(rid: string, origin: string): Promise<GZProfile> {
  const url = `${origin}/api/who/${rid}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`RID not found: ${rid}`);
  const data = await res.json();
  
  const who = data.who;
  const results = data.results || [];
  if (!who) throw new Error(`Could not process profile for RID: ${rid}`);

  // *** START OF CORRECT FIX ***
  // 1. Extract the canonical archetype saved during the assessment
  const archResult = results.find((r: any) => r.domain === 'ARCH');
  const archetypeId = archResult?.payload?.winner || 'unknown';
  const archetypeConfidence = archResult ? 0.99 : 0; // High confidence if it was explicitly saved

  const domains: Record<DomainKey, DomainProfile> = {} as any;
  const facets: Record<string, number> = {};

  // 2. Use the `who` object as the source of truth for scores
  for (const domainKey in who.raw) {
    const d = domainKey as DomainKey;
    const domainRaw = who.derived.domainMeans[d];
    const domainPct = Math.round(((domainRaw - 1) / 4) * 100);
    
    let bucket: 'High' | 'Med' | 'Low' = 'Med';
    if (domainPct >= 67) bucket = 'High';
    else if (domainPct <= 33) bucket = 'Low';

    domains[d] = {
      raw: domainRaw,
      pct: domainPct,
      bucket: bucket
    };

    for (const facetKey in who.raw[d]) {
      facets[`${d}:${facetKey}`] = who.raw[d][facetKey];
    }
  }
  
  const profile: GZProfile = {
    rid,
    profile_hash: await sha256(JSON.stringify(data.results)),
    domains,
    facets,
    archetype: { id: archetypeId, confidence: archetypeConfidence }
  };
  // *** END OF CORRECT FIX ***

  return profile;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ridA = url.searchParams.get('ridA');
    const ridB = url.searchParams.get('ridB');
    const origin = `${url.protocol}//${url.host}`;

    console.log(`--- Archetype Duals API Request ---`);
    console.log(`Received ridA: ${ridA}, ridB: ${ridB}`);

    if (!ridA || !ridB) {
      return NextResponse.json({ error: 'ridA and ridB required' }, { status: 400 });
    }

    const profileA = await loadFullProfile(ridA, origin);
    const profileB = await loadFullProfile(ridB, origin);
    
    console.log(`Profile A Archetype: ${profileA.archetype.id}`);
    console.log(`Profile B Archetype: ${profileB.archetype.id}`);
    console.log(`---------------------------------`);

    const comparisonData = compareArchetypes(profileA, profileB);

    return NextResponse.json(comparisonData);
  } catch (e: any) {
    console.error("Error in Archetype Duals API:", e);
    return NextResponse.json({ error: e?.message || 'fail' }, { status: 500 });
  }
}


