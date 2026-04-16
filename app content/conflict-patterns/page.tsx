'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { canonicalFacets, DOMAINS, FACET_INTERPRETATIONS, type DomainKey } from '@/lib/bigfive/constants';
import { selectFiveCards } from '@/lib/bigfive/fiveCardSelector';

const Stars = ({ count }:{ count:number }) => (
  <div className="flex gap-1">
    {Array.from({length:5}).map((_,i)=> (
      <span key={i} className={i < count ? 'text-yellow-300' : 'text-white/20'}>★</span>
    ))}
  </div>
);

function ConflictContent(){
  const search = useSearchParams();
  const rid = search.get('rid');
  const [fullResults, setFullResults] = useState<Array<{domain:DomainKey; payload:any}>|null>(null);
  const [accentColor, setAccentColor] = useState('#d4af37');

  function neonBorderStyle(){
    const glow = 'rgba(212,175,55,0.6)';
    const wide = 'rgba(212,175,55,0.25)';
    const border = 'rgba(212,175,55,0.5)';
    return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
  }

  useEffect(()=>{
    (async ()=>{
      try{
        if (!rid) return;
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();
        setFullResults(Array.isArray(data?.results) ? (data.results as any) : null);
      } catch {}
    })();
  },[rid]);

  if (!rid) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Missing rid</div>;
  if (!fullResults) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;

  const facets: Array<{domain:DomainKey; facet:string; raw:number; bucket:'High'|'Medium'|'Low'}> = [];
  for (const d of ['O','C','E','A','N'] as DomainKey[]){
    const payload = (fullResults.find(r=> r.domain===d) || ({} as any)).payload;
    if (!payload) continue;
    const A_raw = (payload?.phase2?.A_raw || {}) as Record<string, number>;
    const bucket = (payload?.final?.bucket || {}) as Record<string,'High'|'Medium'|'Low'>;
    for (const f of canonicalFacets(d)){
      const raw = Number(A_raw?.[f] ?? 3);
      const b = (bucket?.[f] as any) as 'High'|'Medium'|'Low' || 'Medium';
      facets.push({ domain:d, facet:f, raw, bucket: b });
    }
  }
  const cards = selectFiveCards(facets).filter((c:any)=> c.type==='conflict');

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Back Button */}
      <Link 
        href={`/portal?rid=${rid}`}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-black/80 border border-white/30 rounded-lg text-white hover:text-white hover:bg-black hover:border-white/50 transition-all font-mono text-base uppercase tracking-wider backdrop-blur-sm shadow-lg"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span className="font-semibold">BACK</span>
      </Link>
      
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold" style={{ color: accentColor }}>Conflict Patterns</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {cards.map((card:any, i:number)=>{
            const avgPct = card.leftPct && card.rightPct ? (card.leftPct + card.rightPct)/2 : 50;
            const stars = avgPct >= 80 ? 5 : avgPct >= 60 ? 4 : avgPct >= 40 ? 3 : avgPct >= 20 ? 2 : 1;
            return (
              <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4" style={neonBorderStyle()}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{card.facet}</h3>
                  <Stars count={stars} />
                </div>
                {typeof card.explanation === 'string' ? (
                  <p className="text-white/90 text-sm mb-2">{card.explanation}</p>
                ) : null}
                {typeof card.friction === 'string' ? (
                  <p className="text-white/80 text-xs mb-3">{card.friction}</p>
                ) : null}
                {typeof card.how_can_both_be_true === 'string' ? (
                  <div className="rounded-md border border-white/10 bg-black/30 p-3">
                    <div className="text-xs text-white/60 mb-1">How can both be true?</div>
                    <p className="text-white/90 text-sm">{card.how_can_both_be_true}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <p className="text-white/80">These are your top conflict patterns. They represent the core tensions that shape your behavior, especially under pressure.</p>
        </div>

      </div>
    </main>
  );
}

export default function ConflictPatternsPage(){
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>}>
      <ConflictContent />
    </Suspense>
  );
}


