"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import bank from "@/gz-final/bankv1.json";
import { DOMAINS, canonicalFacets } from "@/lib/bigfive/constants";
import { resolveWithArctypsRules } from "@/arctyps routing";
import archRules from "@/arctyps rules.json";
import { getFacetScoreLevel, toPercentFromRaw, stableStringify } from "@/lib/bigfive/format";
import { sha256Hex } from "@/lib/crypto/sha256hex";
import { DOMAIN_CHROME } from "@/lib/ui/domain-chrome";
import { GlowPanel, MicroBar, SystemLabel } from "@/components/ui/BrandChrome";

type DomainKey = keyof typeof DOMAINS; // 'O'|'C'|'E'|'A'|'N'

function toCanonicalFacet(domain: DomainKey, facet: string): string {
  if (domain === 'O' && facet === 'Values Openness') return 'Liberalism';
  return facet;
}

function getCircuitInfo(name: 'Energy' | 'Clarity' | 'Structure' | 'Bond' | 'Drive', value: number): { name: string; value: number; level: string; description: string } {
  let level = 'Medium';
  if (value > 0.33) level = 'High';
  else if (value < -0.33) level = 'Low';

  let description = '';
  switch (name) {
    case 'Energy':
      description = level === 'High' ? 'You are driven by a need for action and momentum, but you risk burnout if you don\'t build in recovery periods.' : level === 'Low' ? 'You conserve energy and prefer steady, sustainable rhythms. Make sure you\'re not missing opportunities for growth.' : 'Your energy flow is balanced.';
      break;
    case 'Clarity':
      description = level === 'High' ? 'You are highly open to new ideas and experiences, which fuels your creativity.' : level === 'Low' ? 'You prefer concrete facts and familiar routines, providing stability.' : 'You balance imagination with practicality.';
      break;
    case 'Structure':
      description = level === 'High' ? 'You are disciplined and organized, which helps you execute long-term plans.' : level === 'Low' ? 'You are flexible and spontaneous, able to adapt to changing circumstances.' : 'You can be organized when needed, but are not rigid.';
      break;
    case 'Bond':
      description = level === 'High' ? 'You are cooperative and empathetic, which helps you build strong relationships.' : level === 'Low' ? 'You are independent and skeptical, which protects you from being taken advantage of.' : 'You are agreeable but maintain healthy boundaries.';
      break;
    case 'Drive':
      description = level === 'High' ? 'You are emotionally stable and resilient, allowing you to pursue goals without being derailed by stress.' : level === 'Low' ? 'You are sensitive to stress, which can be a powerful motivator for change if channeled correctly.' : 'You experience a normal range of emotions, both positive and negative.';
      break;
  }
  return { name: `${name} Circuit`, value, level, description };
}

export default function GZFinalAssessment(){
  const router = useRouter();
  const basePath = useMemo(()=> (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, ''), []);
  const assetUrl = (p:string)=> `${basePath}${p}`;
  // Archetype UI meta: title, image, and bird description
  const ARCHETYPE_META: Record<string, { title: string; img: string; desc: string }> = useMemo(()=>({
    sovereign: { title:'Sovereign', img:'/sovereign.png', desc:'I rise in direct ascent, wings locked, owning the sky. Nothing above me but the sun itself.' },
    rebel:     { title:'Rebel',     img:'/rebel.png',     desc:'I twist through air in erratic bursts, sharp turns breaking every pattern mid-flight. Order means nothing to me.' },
    visionary: { title:'Visionary', img:'/visionary.png', desc:'I carve long arcs forward, eyes set on horizons no one else has seen yet. My body lives in tomorrow\'s wind.' },
    navigator: { title:'Navigator', img:'/navigator.png', desc:'I glide across endless distances, adjusting course through every crosswind. Storm or calm, I find the way.' },
    guardian:  { title:'Guardian',  img:'/guardian.png',  desc:'I circle wide, watching, shielding the formation. Approach with peace and I stay graceful; threaten and I rise fierce.' },
    seeker:    { title:'Seeker',    img:'/seeker.png',    desc:'I dive with piercing precision, cutting through veils and illusions. What lies beneath is mine to uncover.' },
    architect: { title:'Architect', img:'/architect.png', desc:'I climb in measured steps, every angle chosen, every strand reinforced. My flight builds as much as it moves.' },
    spotlight: { title:'Spotlight', img:'/spotlight.png', desc:'I spiral upward, radiant, all eyes pulled to my shimmer. Flight is my stage, the sky my mirror.' },
    diplomat:  { title:'Diplomat',  img:'/diplomat.png',  desc:'I weave gently through the currents, smoothing turbulence, easing the path of those beside me.' },
    partner:   { title:'Partner',   img:'/partner.png',   desc:'I fly in water if not in sky, always wing-to-wing, never breaking from the one I\'ve chosen.' },
    provider:  { title:'Provider',  img:'/provider.png',  desc:'I lift with strength enough for others, carrying their weight in my draft. My currents are never just for me.' },
    catalyst:  { title:'Catalyst',  img:'/catalyst.png',  desc:'I explode off the air in impossible speed, scattering stillness, igniting motion where none existed.' },
    vessel:    { title:'Vessel',    img:'/vessel.png',    desc:'I stroke the air in slow, deliberate movements, each motion refined, each landing an act of grace.' }
  }), []);

  // Short per-archetype hints for final match subtitles (dynamic, not axis-generic)
  const ARCHETYPE_HINTS: Record<string, string> = useMemo(()=>({
    sovereign: 'Lead with structure, authority, and decisive pace',
    rebel: 'Break constraints; favor independence over consensus',
    visionary: 'Invent through ideas; pull toward unseen horizons',
    navigator: 'Guide through change; adjust course with people',
    guardian: 'Protect the formation; push momentum when needed',
    seeker: 'Cut through noise; dig for the underlying truth',
    architect: 'Design and build systems; deliberate and precise',
    spotlight: 'Energize the room; pull focus and lift morale',
    diplomat: 'Smooth turbulence; connect through empathy',
    partner: 'Stabilize the group; keep the lane steady',
    provider: 'Carry the load; reliability for others',
    vessel: 'Move with grace; keep peace and composure'
  }), []);
  // Linear 30-facet flow state
  const domainOrder = useMemo<DomainKey[]>(()=> (bank as any).domain_order as any, []);
  type FacetItem = { domain: DomainKey; facet: string; binId: string; binQ: string; likId: string; likQ: string };
  const facetList = useMemo<FacetItem[]>(()=>{
    const items: FacetItem[] = [];
    for (const d of domainOrder){
      // New linear bank format support
      const facetsSpec = (bank as any).domains?.[d]?.facets as Array<{id:string; facet:string; binary_question:string; likert_question:string}> | undefined;
      if (Array.isArray(facetsSpec) && facetsSpec.length){
        for (const s of facetsSpec){
          items.push({ domain: d, facet: s.facet, binId: `${s.id}.bin`, binQ: s.binary_question, likId: `${s.id}.lik`, likQ: s.likert_question });
        }
        continue;
      }
      // Fallback to legacy bank structure if present
      const order: string[] = ((bank as any).facet_order?.[d] as string[]) || canonicalFacets(d);
      const bin = (bank as any).domains?.[d]?.picked_binary as Array<{id:string; facet:string; q:string}> | undefined;
      const lik = (bank as any).domains?.[d]?.picked_likert as Array<{id:string; facet:string; q:string}> | undefined;
      for (const f of order){
        const binItem = bin?.find(it=> it.facet === f);
        const likItem = lik?.find(it=> it.facet === f);
        if (binItem && likItem){
          items.push({ domain: d, facet: f, binId: binItem.id, binQ: binItem.q, likId: likItem.id, likQ: likItem.q });
        }
      }
    }
    return items;
  }, [domainOrder]);

  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState<'bin'|'likert'|'arch'|'done'>('bin');
  const [finalScores, setFinalScores] = useState<Record<DomainKey, Record<string, number>>>(()=> ({ O:{}, C:{}, E:{}, A:{}, N:{} } as any));
  const personalization = useRef<DomainKey | null>(null);
  // Archetype mini-quiz state
  type TriadProbe = { type:'single_choice'; question:string; options:Array<{id:string; label:string}> };
  type BinaryProbe = { type:'binary'; question:string; left:{id:string; label:string}; right:{id:string; label:string}; meta?:{ stage?:'pair'|'final'; present?:'image_pair'|'binary' } };
  type AnyProbe = TriadProbe | BinaryProbe;
  const [archProbe, setArchProbe] = useState<AnyProbe|null>(null);
  const archResolveRef = useRef<((id:string)=>void)|null>(null);
  const archStarted = useRef(false);
  const [archWinner, setArchWinner] = useState<string|null>(null);
  const archTrace = useRef<Array<{ q:string; type:'triad'|'binary'; options:string[]; pick:string }>>([]);
  const [circuitPreviewData, setCircuitPreviewData] = useState<{ name: string; value: number; level: string; description: string } | null>(null);
  const [showCircuitPreview, setShowCircuitPreview] = useState(false);
  const shownPreviews = useRef(new Set<string>());
  // no error/bank blocking; we rely on bank for flow

  useEffect(() => {
    if (idx < 6 || (step !== 'bin' && step !== 'likert')) {
      return;
    }

    let domainToShow: DomainKey | null = null;
    if (idx >= 30) domainToShow = 'N';
    else if (idx >= 24) domainToShow = 'A';
    else if (idx >= 18) domainToShow = 'E';
    else if (idx >= 12) domainToShow = 'C';
    else if (idx >= 6) domainToShow = 'O';

    if (!domainToShow) {
      return;
    }

    const d = domainToShow;
    const facets = canonicalFacets(d);
    const domainScores = facets.map(f => {
      const canonicalFacetName = toCanonicalFacet(d, f);
      return finalScores[d]?.[canonicalFacetName];
    }).filter(s => typeof s === 'number') as number[];

    const mean = domainScores.length > 0
      ? domainScores.reduce((a, b) => a + b, 0) / domainScores.length
      : 3;

    let newPreview: { name: string; value: number; level: string; description: string } | null = null;

    switch (d) {
      case 'O':
        newPreview = getCircuitInfo('Clarity', Math.max(-1, Math.min(1, (mean - 3) / 2)));
        break;
      case 'C':
        newPreview = getCircuitInfo('Structure', Math.max(-1, Math.min(1, (mean - 3) / 2)));
        break;
      case 'E':
        newPreview = getCircuitInfo('Energy', Math.max(-1, Math.min(1, (mean - 3) / 2)));
        break;
      case 'A':
        newPreview = getCircuitInfo('Bond', Math.max(-1, Math.min(1, (mean - 3) / 2)));
        break;
      case 'N':
        newPreview = getCircuitInfo('Drive', Math.max(-1, Math.min(1, (3 - mean) / 2)));
        break;
    }

    if (newPreview && !shownPreviews.current.has(newPreview.name)) {
      setCircuitPreviewData(newPreview);
      shownPreviews.current.add(newPreview.name);
      // Defer opening so it never races the same tick as answer state (avoids odd hit-target / paint ordering).
      queueMicrotask(() => setShowCircuitPreview(true));
    }
  }, [idx, finalScores, step]);

  useEffect(() => {
    if (step === 'arch' && !archStarted.current) {
      archStarted.current = true;
      (async () => {
        const ask = async (probe: AnyProbe): Promise<string> => {
          return new Promise<string>((resolve) => {
            setArchProbe(probe);
            archResolveRef.current = (id:string)=>{
              // record trace
              if (probe.type === 'single_choice'){
                archTrace.current.push({ q: probe.question, type:'triad', options: probe.options.map(o=>o.label), pick: id });
              } else {
                archTrace.current.push({ q: probe.question, type:'binary', options: [probe.left.label, probe.right.label], pick: id });
              }
              resolve(id);
            };
          });
        };
        try{
          // 1) Build user buckets from finalScores
          const domains: Record<DomainKey, { mean: number; bucket: 'High'|'Medium'|'Low'; facet: Record<string,'High'|'Medium'|'Low'> }> = { O: {} as any, C: {} as any, E: {} as any, A: {} as any, N: {} as any };
          const toBucket = (v:number): 'High'|'Medium'|'Low' => (v>=4?'High':(v<=2?'Low':'Medium'));
          for (const d of domainOrder){
            const facs = canonicalFacets(d);
            const raw = facs.map(f=> Math.max(1, Math.min(5, finalScores[d]?.[toCanonicalFacet(d,f)] ?? 3)));
            const mean = Math.round((raw.reduce((a,c)=>a+c,0)/raw.length)*100)/100;
            const facetBuckets: Record<string,'High'|'Medium'|'Low'> = {} as any;
            facs.forEach((f,i)=>{ facetBuckets[f] = toBucket(raw[i]); });
            const meanBucket: 'High'|'Medium'|'Low' = (mean>=3.75?'High':(mean<=2.25?'Low':'Medium'));
            domains[d] = { mean, bucket: meanBucket, facet: facetBuckets } as any;
          }

          // 2) Evaluate JSON rules to select matching archetypes
          type Bucket = 'High'|'Medium'|'Low';
          const A = (archRules as any).archetypes as Array<any>;
          function passFacetCluster(d:DomainKey, cluster:any): boolean {
            if (!cluster) return true;
            if (cluster.require){
              return Array.isArray(cluster.require) && cluster.require.every((r:any)=> domains[d].facet[r.facet] === r.bucket);
            }
            if (typeof cluster.min_high === 'number' && Array.isArray(cluster.facets)){
              let c=0; for (const f of cluster.facets){ if (domains[d].facet[f]==='High') c++; }
              return c >= cluster.min_high;
            }
            if (Array.isArray(cluster.any_high)){
              return cluster.any_high.some((f:string)=> domains[d].facet[f]==='High');
            }
            if (Array.isArray(cluster.any_low)){
              return cluster.any_low.some((f:string)=> domains[d].facet[f]==='Low');
            }
            return true;
          }
          function matchesRules(ar:any): boolean {
            const domReq = ar?.rules?.domains || {};
            for (const k of Object.keys(domReq||{}) as DomainKey[]){
              const want = domReq[k] as Bucket; if (!want) continue;
              if (domains[k].bucket !== want) return false;
            }
            const clusters = ar?.rules?.facet_clusters || {};
            for (const k of Object.keys(clusters||{}) as DomainKey[]){
              if (!passFacetCluster(k, clusters[k])) return false;
            }
            return true;
          }
          let ids = A.filter(matchesRules).map(x=> x.id as string);
          
          // =============================================================
          // START: PROXIMITY BACKFILL LOGIC (NO RANDOMNESS)
          // =============================================================

          // Target values for calculating distance from "ideal"
          const TARGET_VALS = { High: 5, Medium: 3, Low: 1 };

          // Helper to calculate "Distance" between User and Archetype Rules
          function getDistance(archId: string, userDomains: any): number {
            const rules = (archRules as any).archetypes.find((a: any) => a.id === archId)?.rules?.domains;
            if (!rules) return 999; // Penalty if rules missing

            let totalDiff = 0;
            // Calculate difference for all 5 domains (O, C, E, A, N)
            for (const d of ['O', 'C', 'E', 'A', 'N']) {
              const userVal = userDomains[d].mean; // User's raw mean (1-5)
              const ruleBucket = rules[d]; // "High", "Medium", "Low"
              
              // If rule exists, compare. If rule is missing (e.g. Partner has some "Medium"), default to 3.
              const targetVal = ruleBucket ? TARGET_VALS[ruleBucket as keyof typeof TARGET_VALS] : 3;
              
              // Add the absolute difference to the score
              totalDiff += Math.abs(userVal - targetVal);
            }
            return totalDiff;
          }

          // If we have fewer than 2 strict matches, we use Proximity Backfill to reach 2
          if (ids.length < 2) {
            const allIds = (archRules as any).archetypes.map((x: any) => x.id as string);
            
            // Filter out the ones we already found strictly
            const candidates = allIds.filter((x: string) => !ids.includes(x));

            // Sort candidates by lowest distance (closest fit)
            candidates.sort((a: string, b: string) => {
              return getDistance(a, domains) - getDistance(b, domains);
            });

            // Take the best matches to fill the remaining slots
            const needed = 2 - ids.length;
            ids = ids.concat(candidates.slice(0, needed));
          }

          // CAP AT 2 (Sudden Death Mode)
          // Even if we naturally matched > 2, we slice to the top 2
          if (ids.length > 2) {
            ids = ids.slice(0, 2);
          }
          
          // =============================================================
          // END: PROXIMITY BACKFILL LOGIC
          // =============================================================
          
          const winner = await resolveWithArctypsRules(ids, ask);
          setArchWinner(winner);
        } finally {
          setArchProbe(null);
          setStep('done');
        }
      })();
    }
  }, [step]);

  async function finalizeAndSave(){
    // Build legacy-compatible results array expected by results/who pages
    const results: Array<{ domain: DomainKey; payload: any }> = [];
    for (const d of domainOrder){
      const facets = canonicalFacets(d);
      const A_raw: Record<string, number> = {};
      for (const f of facets){ A_raw[f] = Math.max(1, Math.min(5, finalScores[d]?.[toCanonicalFacet(d,f)] ?? 3)); }
      const A_pct: Record<string, number> = Object.fromEntries(facets.map(f=> [f, toPercentFromRaw(A_raw[f])])) as any;
      const bucket: Record<string, 'High'|'Medium'|'Low'> = Object.fromEntries(facets.map(f=> {
        const raw = A_raw[f];
        if (raw >= 5) return [f, 'High' as 'High'|'Medium'|'Low'];
        if (raw <= 2) return [f, 'Low' as 'High'|'Medium'|'Low'];
        return [f, 'Medium' as 'High'|'Medium'|'Low'];
      })) as any;
      const order = facets.slice().sort((a,b)=>{
        const rank = { High:3, Medium:2, Low:1 } as const;
        if (rank[bucket[a]] !== rank[bucket[b]]) return rank[bucket[a]] - rank[bucket[b]];
        if (A_raw[b] !== A_raw[a]) return A_raw[b] - A_raw[a];
        return facets.indexOf(a) - facets.indexOf(b);
      });
      const domain_mean_raw = Math.round((facets.reduce((s,f)=> s + (A_raw[f]||3), 0)/facets.length)*100)/100;
      const domain_mean_pct = Math.round((toPercentFromRaw(domain_mean_raw))*10)/10;

      const payload = {
        version: (bank as any).version,
        domain: d,
        phase1: { p: Object.fromEntries(facets.map(f=> [f,0])), m: Object.fromEntries(facets.map(f=> [f,0])), t: Object.fromEntries(facets.map(f=> [f,0])), P: Object.fromEntries(facets.map(f=> [f,0])) },
        phase2: { answers: [], A_raw },
        phase3: { asked: [] },
        final: { A_pct, bucket, order, domain_mean_raw, domain_mean_pct },
        audit: { personalization: personalization.current }
      };
      results.push({ domain: d, payload });
    }
    // Append Archetype result if present
    if (archWinner){
      (results as any).push({
        domain: 'ARCH',
        payload: { winner: archWinner, trace: archTrace.current }
      });
    }

    try{
      const res = await fetch('/api/runs', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ results }) });
      if (res.ok){
        const data = await res.json();
        const rid = data?.rid;
        if (typeof rid === 'string' && rid.length){
          router.push(`/portal?rid=${rid}`);
          return;
        }
      }
      // fallback: compute client rid deterministically and route to who page
      try {
        const rid = await sha256Hex(stableStringify(results)).then(s=> s.slice(0,24));
        localStorage.setItem('gz_full_results', JSON.stringify(results));
        router.push(`/portal?rid=${rid}`);
        return;
      } catch {}
      // last resort: route to results
      try { localStorage.setItem('gz_full_results', JSON.stringify(results)); } catch {}
      router.push('/results');
    } catch {
      try {
        const rid = await sha256Hex(stableStringify(results)).then(s=> s.slice(0,24));
        localStorage.setItem('gz_full_results', JSON.stringify(results));
        router.push(`/portal?rid=${rid}`);
        return;
      } catch {}
      try { localStorage.setItem('gz_full_results', JSON.stringify(results)); } catch {}
      router.push('/results');
    }
  }

  // Render
  const total = facetList.length;
  const current = facetList[idx];
  
  // Calculate progress including archetype questions
  const getProgress = () => {
    if (step === 'done') return total + 3; // Total main questions + estimated archetype questions
    if (step === 'arch') {
      // During archetype step, show progress based on archetype questions completed
      const archQuestionsCompleted = archTrace.current.length;
      return total + archQuestionsCompleted;
    }
    return idx;
  };
  
  const progress = getProgress();
  const totalWithArchetype = total + 3; // Estimate 3 archetype questions
  const progressPercentage = (progress / totalWithArchetype) * 100;
  const progressFill =
    step === "arch" || step === "done"
      ? "#fbbf24"
      : current
        ? DOMAIN_CHROME[current.domain]
        : "#fbbf24";

  if (!current && step !== 'done') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <GlowPanel padding="md" accent="#fbbf24" className="max-w-sm w-full text-center">
          <SystemLabel className="mb-3">Assessment // Initializing</SystemLabel>
          <p className="text-gray-300 m-0">Loading…</p>
        </GlowPanel>
      </div>
    );
  }

  const renderStepContent = () => {
    if (step === 'bin' && current){
      const d = current.domain;
      return (
        <>
          <div
            className="assessment-step"
            style={{ ["--domain-ring" as string]: DOMAIN_CHROME[d] }}
          >
            <GlowPanel padding="md" accent={DOMAIN_CHROME[d]} className="mb-4">
              <p className="text-[17px] font-medium text-gray-100 leading-snug m-0">{current.binQ}</p>
            </GlowPanel>
            <div className="row mt16">
              {/* No → route to Likert clarification */}
              <button type="button" key={`no-${idx}`} className="rate btn rate-btn--chrome"
                onTouchStart={(e)=> e.currentTarget.classList.add('selected')}
                onClick={()=> setStep('likert')}>No</button>
              {/* Yes → moderate agreement = 4 */}
              <button type="button" key={`yes-${idx}`} className="rate btn rate-btn--chrome"
                onTouchStart={(e)=> e.currentTarget.classList.add('selected')}
                onClick={()=>{
                const facetKey = toCanonicalFacet(d, current.facet);
                setFinalScores(prev=> ({ ...prev, [d]: { ...(prev[d]||{}), [facetKey]: 4 } } as any));
                if (idx + 1 < total) {
                  setIdx((n) => n + 1);
                  setStep('bin');
                } else {
                  setStep('arch');
                }
              }}>Yes</button>
              {/* Yup → maximum conviction = 5 */}
              <button type="button" key={`yup-${idx}`} className="rate btn rate-btn--chrome"
                onTouchStart={(e)=> e.currentTarget.classList.add('selected')}
                onClick={()=>{
                const facetKey = toCanonicalFacet(d, current.facet);
                setFinalScores(prev=> ({ ...prev, [d]: { ...(prev[d]||{}), [facetKey]: 5 } } as any));
                if (idx + 1 < total) {
                  setIdx((n) => n + 1);
                  setStep('bin');
                } else {
                  setStep('arch');
                }
              }}>Yup, that's always me</button>
            </div>
          </div>
        </>
      );
    }
  
    if (step === 'likert' && current){
      const d = current.domain;
      const ratings = [
        { text: 'Strongly Disagree', val: 1 },
        { text: 'Disagree', val: 2 },
        { text: 'Neutral', val: 3 },
        { text: 'Agree', val: 4 },
        { text: 'Strongly Agree', val: 5 }
      ] as const;
       return (
         <>
<div
            className="assessment-step"
            style={{ ["--domain-ring" as string]: DOMAIN_CHROME[d] }}
          >
            <GlowPanel padding="md" accent={DOMAIN_CHROME[d]} className="mb-4">
              <p className="text-[17px] font-medium text-gray-100 leading-snug m-0">{current.likQ}</p>
            </GlowPanel>
            <div className="row mt16">
            {ratings.map(r=> (
              <button type="button" key={`${r.val}-${idx}`} className="rate btn rate-btn--chrome"
                onTouchStart={(e)=> e.currentTarget.classList.add('selected')}
                onClick={()=>{
                // Asymmetric Likert scoring for the "No" path:
                // 5→1, 4→2, 3→2.5, 2→3, 1→3.5
                const map: Record<number, number> = { 5:1, 4:2, 3:2.5, 2:3, 1:3.5 };
                const final = map[r.val as number] ?? 2;
                const facetKey = toCanonicalFacet(d, current.facet);
                setFinalScores(prev=> ({ ...prev, [d]: { ...(prev[d]||{}), [facetKey]: final } } as any));
                if (idx + 1 < total) {
                  setIdx((n) => n + 1);
                  setStep('bin');
                } else {
                  setStep('arch');
                }
              }}>{r.text}</button>
            ))}
          </div>
          <div className="row mt16" style={{justifyContent:'flex-start'}}>
<button type="button" className="ghost rounded-full border border-white/15 bg-white/5 px-5 py-2.5 backdrop-blur-md hover:bg-white/10" onClick={()=> setStep('bin')}>Back</button>
          </div>
          </div>
        </>
      );
    }

    if (step === 'arch'){
      if (!archProbe){
        return (
          <>
            <SystemLabel className="mb-3">Archetype engine // Warming up</SystemLabel>
            <h2 className="m-0 text-xl font-semibold text-white">Finding your archetype…</h2>
            <p className="muted mt-2 text-sm">Setting up a quick 2–3 question tie-breaker.</p>
          </>
        );
      }
      if (archProbe.type === 'single_choice'){
        const fallbackTriadQ = (archRules as any)?.tie_layer?.fallbacks?.triad_question as string | undefined;
        const isFallbackTriad = fallbackTriadQ && archProbe.question === fallbackTriadQ;
        return (
          <>
            <GlowPanel padding="md" accent="#a855f7" className="mb-4">
              <p className="m-0 text-[17px] font-medium text-gray-100 leading-snug">{archProbe.question}</p>
            </GlowPanel>
            {isFallbackTriad ? (
              <div className="facet-grid mt8" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))'}}>
                {archProbe.options.map(o=> {
                  const meta = ARCHETYPE_META[o.id] || { title:o.id, img:'/equalizer.png', desc:o.label };
                  return (
                    <button key={o.id} className="btn-chip" style={{padding:0, background:'transparent'}} onClick={()=> archResolveRef.current?.(o.id)}>
                      <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm">
                        <div style={{textAlign:'center', padding:'8px 8px 0 8px'}}>
                          <strong>{meta.title}</strong>
                        </div>
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px'}}>
                <img src={assetUrl(meta.img)} alt={meta.title} style={{maxWidth:'100%', height:140, objectFit:'contain', borderRadius:8}}
                  onError={(e)=>{ e.currentTarget.onerror=null as any; e.currentTarget.src=assetUrl('/equalizer.png'); }} />
              </div>
                        <div style={{padding:'0 12px 12px 12px'}}>
                          <p className="muted" style={{fontSize:12, lineHeight:1.4}}>{meta.desc}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="facet-grid mt8">
                {archProbe.options.map(o=> (
                  <button key={o.id} className="btn-chip" onClick={()=> archResolveRef.current?.(o.id)}>
                    <b>{o.label}</b>
                  </button>
                ))}
              </div>
            )}
          </>
        );
      }
      const isImagePair = (archProbe as any)?.meta?.present === 'image_pair';
      if (isImagePair){
        const L = archProbe.left.id; const R = archProbe.right.id;
        const leftMeta  = ARCHETYPE_META[L] || { title: L, img:'/equalizer.png', desc: L };
        const rightMeta = ARCHETYPE_META[R] || { title: R, img:'/equalizer.png', desc: R };
        return (
          <>
            <GlowPanel padding="md" accent="#a855f7" className="mb-6 text-center">
              <p className="m-0 text-sm text-gray-100 leading-relaxed">
                Based on your profile, we matched you with <strong>{leftMeta.title}</strong> and <strong>{rightMeta.title}</strong>. 
                <br />Now choose which one represents you.
              </p>
            </GlowPanel>
            <div className="archetype-dual-container">
              <button className="btn archetype-dual-btn" onClick={()=> archResolveRef.current?.(L)}>
              <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm">
                <div style={{textAlign:'center', padding:'8px 8px 0 8px'}}><strong>{leftMeta.title}</strong></div>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px'}}>
                  <img src={assetUrl(leftMeta.img)} alt={leftMeta.title} style={{maxWidth:'100%', height:140, objectFit:'contain', borderRadius:8}}
                    onError={(e)=>{ e.currentTarget.onerror=null as any; e.currentTarget.src=assetUrl('/equalizer.png'); }} />
                </div>
                <div style={{padding:'0 12px 12px 12px'}}>
                  <p className="muted" style={{fontSize:12, lineHeight:1.4}}>{leftMeta.desc}</p>
                </div>
              </div>
            </button>
            <div className="vs-badge">VS</div>
            <button className="btn archetype-dual-btn" onClick={()=> archResolveRef.current?.(R)}>
              <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm">
                <div style={{textAlign:'center', padding:'8px 8px 0 8px'}}><strong>{rightMeta.title}</strong></div>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px'}}>
                  <img src={assetUrl(rightMeta.img)} alt={rightMeta.title} style={{maxWidth:'100%', height:140, objectFit:'contain', borderRadius:8}}
                    onError={(e)=>{ e.currentTarget.onerror=null as any; e.currentTarget.src=assetUrl('/equalizer.png'); }} />
                </div>
                <div style={{padding:'0 12px 12px 12px'}}>
                  <p className="muted" style={{fontSize:12, lineHeight:1.4}}>{rightMeta.desc}</p>
                </div>
              </div>
            </button>
          </div>
          </>
        );
      }
      const L = archProbe.left.id; const R = archProbe.right.id;
      const leftMeta  = ARCHETYPE_META[L] || { title: L, img:'/equalizer.png', desc: L };
      const rightMeta = ARCHETYPE_META[R] || { title: R, img:'/equalizer.png', desc: R };
      return (
        <>
          <GlowPanel padding="md" accent="#a855f7" className="mb-6 text-center">
            <p className="m-0 text-sm text-gray-100 leading-relaxed">
              Based on your profile, we matched you with <strong>{leftMeta.title}</strong> and <strong>{rightMeta.title}</strong>. 
              <br />Now choose which one represents you.
            </p>
          </GlowPanel>
          <div className="archetype-dual-container">
            <button className="btn archetype-dual-btn" onClick={()=> archResolveRef.current?.(L)}>
              <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm">
                <div style={{textAlign:'center', padding:'8px 8px 0 8px'}}><strong>{leftMeta.title}</strong></div>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px'}}>
                  <img src={assetUrl(leftMeta.img)} alt={leftMeta.title} style={{maxWidth:'100%', height:140, objectFit:'contain', borderRadius:8}}
                    onError={(e)=>{ e.currentTarget.onerror=null as any; e.currentTarget.src=assetUrl('/equalizer.png'); }} />
                </div>
                <div style={{padding:'0 12px 12px 12px'}}>
                  <p className="muted" style={{fontSize:12, lineHeight:1.4}}>{leftMeta.desc}</p>
                </div>
              </div>
            </button>
            <div className="vs-badge">VS</div>
            <button className="btn archetype-dual-btn" onClick={()=> archResolveRef.current?.(R)}>
              <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-sm">
                <div style={{textAlign:'center', padding:'8px 8px 0 8px'}}><strong>{rightMeta.title}</strong></div>
                <div style={{display:'flex',justifyContent:'center',alignItems:'center',padding:'8px'}}>
                  <img src={assetUrl(rightMeta.img)} alt={rightMeta.title} style={{maxWidth:'100%', height:140, objectFit:'contain', borderRadius:8}}
                    onError={(e)=>{ e.currentTarget.onerror=null as any; e.currentTarget.src=assetUrl('/equalizer.png'); }} />
                </div>
                <div style={{padding:'0 12px 12px 12px'}}>
                  <p className="muted" style={{fontSize:12, lineHeight:1.4}}>{rightMeta.desc}</p>
                </div>
              </div>
            </button>
          </div>
        </>
      );
    }
  
    if (step === 'done') {
      return (
        <>
          <SystemLabel className="mb-3">Run complete // Ready to commit</SystemLabel>
          <h2 className="m-0 text-xl font-semibold text-white">All set</h2>
          <p className="mt-2 text-sm text-gray-400">We will save your run and take you to your insights.</p>
          <div className="row mt16" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-6 py-3 text-base font-semibold text-black shadow-lg shadow-yellow-500/25 transition hover:from-yellow-400 hover:to-amber-500"
              onClick={finalizeAndSave}
            >
              Continue →
            </button>
          </div>
        </>
      );
    }

    return null;
  }

  // Header with owl image only
  const AssessmentHeader = () => (
    <div className="mb-4">
      {/* Owl Image */}
      <div className="flex justify-center relative">
        {/* Glowing background effect */}
        <div className="absolute inset-0 flex justify-center items-center">
          <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-full blur-xl" style={{
            background: 'radial-gradient(circle, rgba(251, 191, 36, 0.36) 0%, rgba(245, 158, 11, 0.24) 50%, transparent 100%)'
          }}></div>
        </div>
        <img 
          src={assetUrl("/the-axis.png")} 
          alt="The Axis" 
          className="h-24 w-24 sm:h-32 sm:w-32 object-contain relative z-10"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative z-[1] mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <AssessmentHeader />
        <div className="mb-6 w-full">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <SystemLabel align="start" className="!text-left text-[9px] sm:text-[10px] text-white/40">
              {step === "arch"
                ? "Phase // Archetype resolution"
                : step === "done"
                  ? "Phase // Commit run"
                  : "Phase // Core vectors"}
            </SystemLabel>
            {current && step !== "arch" && step !== "done" ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white/55">
                {(DOMAINS[current.domain]?.label ?? current.domain).split(" (")[0]}
              </span>
            ) : null}
          </div>
          <div className="mb-2 flex justify-between text-[11px] font-mono uppercase tracking-wider text-white/45">
            <span>Progress</span>
            <span>
              {progress}/{totalWithArchetype}
            </span>
          </div>
          <MicroBar value={progressPercentage} fillColor={progressFill} />
        </div>
        {renderStepContent()}
      </div>
      {showCircuitPreview && circuitPreviewData && (
        <div
          role="presentation"
          onClick={() => setShowCircuitPreview(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.72)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="w-[90%] max-w-md" onClick={(e) => e.stopPropagation()}>
          <GlowPanel padding="md" accent="#fbbf24" className="w-full">
            <div className="text-center mb-4">
              <SystemLabel className="mb-2">Checkpoint // Circuit preview</SystemLabel>
              <p className="text-yellow-400 font-bold text-lg mb-1">Good job, keep going!</p>
              <p className="text-white/80 text-sm m-0">Here&apos;s a sneak peek of what you are:</p>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-black/50 p-4">
              <h3 className="text-yellow-400 font-bold text-lg mb-2">{circuitPreviewData.name}</h3>
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-white/70">Circuit Level</span>
                  <span className="text-sm font-bold" style={{
                    color: circuitPreviewData.level === 'High' ? '#2ecc71' : 
                           circuitPreviewData.level === 'Low' ? '#e74c3c' : '#f1c40f'
                  }}>
                    {circuitPreviewData.level}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.round(((circuitPreviewData.value + 1) / 2) * 100)}%`,
                      backgroundColor: circuitPreviewData.level === 'High' ? '#2ecc71' : 
                                     circuitPreviewData.level === 'Low' ? '#e74c3c' : '#f1c40f'
                    }}
                  ></div>
                </div>
              </div>
              <p className="text-white/80 text-sm">{circuitPreviewData.description}</p>
            </div>
            <button
              type="button"
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-600 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-yellow-500/20 transition hover:from-yellow-400 hover:to-amber-500"
              onClick={() => setShowCircuitPreview(false)}
            >
              Continue
            </button>
          </GlowPanel>
          </div>
        </div>
      )}
    </div>
  )
}