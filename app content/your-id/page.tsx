'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import CTAButton from '@/components/CTAButton';
import archetypeRules from "@/arctyps rules.json";
import archetypeAtlas from "@/lib/data/archetype_atlas.json";
// Field presence bank removed for domain cards UI
import { DOMAINS, canonicalFacets, FACET_INTERPRETATIONS } from "@/lib/bigfive/constants";
import { getScoreLevel } from "@/lib/bigfive/format";
import { selectFiveCards } from "@/lib/bigfive/fiveCardSelector";
import ExistentialCircuits from "@/components/who/ExistentialCircuits";
import bigFiveImpacts from "@/BigFiveImpacts.json";
import { selectWowFacets, type FacetsByDomain as WowFacetsByDomain } from "@/lib/bigfive/wowFacets";
import wowBank from "@/wow.json";
import oneSentenceSummaries from "@/one-sentence-summary.json";
import IdentityMirror from "@/components/who/IdentityMirror";
import PaidContentPreviewModal from '@/components/PaidContentPreviewModal';
import Tooltip from '@/components/Tooltip';


// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || hex.length < 7) return `rgba(76, 175, 239, ${alpha})`; // Default color if hex is invalid
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Tiny star renderer (inline)
const Stars = ({ count }:{ count:number }) => (
  <div className="flex gap-1">
    {Array.from({length:5}).map((_,i)=> (
      <span key={i} className={i < count ? 'text-yellow-300' : 'text-white/20'}>★</span>
    ))}
  </div>
);
// Stacked stars renderer (one star per line)
const StackedStars = ({ count }:{ count:number }) => (
  <div className="flex flex-col gap-1">
    {Array.from({length:5}).map((_,i)=> (
      <div key={i} className={i < count ? 'text-yellow-300' : 'text-white/20'}>★</div>
    ))}
  </div>
);

// Domain tag helper
type DomainKey = 'O'|'C'|'E'|'A'|'N';
const domainToKey: Record<string, DomainKey> = {
  Openness: 'O',
  Conscientiousness: 'C',
  Extraversion: 'E',
  Agreeableness: 'A',
  Neuroticism: 'N'
};

// Synonym map from bank labels to canonical facet keys used in results payloads
const FACET_SYNONYMS: Record<DomainKey, Record<string,string>> = {
  A: {
    'trust':'Trust',
    'compliance':'Cooperation',
    'cooperation':'Cooperation',
    'altruism':'Altruism',
    'tender-mindedness':'Sympathy',
    'sympathy':'Sympathy',
    'straightforwardness':'Morality',
    'morality':'Morality',
    'modesty':'Modesty'
  },
  E: {
    'warmth':'Friendliness',
    'friendliness':'Friendliness',
    'gregariousness':'Gregariousness',
    'assertiveness':'Assertiveness',
    'activity':'Activity Level',
    'activity level':'Activity Level',
    'excitement-seeking':'Excitement-Seeking',
    'positive emotions':'Cheerfulness',
    'cheerfulness':'Cheerfulness'
  },
  O: {
    'feelings':'Emotionality',
    'emotionality':'Emotionality',
    'fantasy':'Imagination',
    'imagination':'Imagination',
    'aesthetics':'Artistic Interests',
    'artistic interests':'Artistic Interests',
    'values':'Liberalism',
    'liberalism':'Liberalism',
    'actions':'Adventurousness',
    'adventurousness':'Adventurousness',
    'ideas':'Intellect',
    'intellect':'Intellect'
  },
  C: {
    'competence':'Self-Efficacy',
    'self-efficacy':'Self-Efficacy',
    'order':'Orderliness',
    'orderliness':'Orderliness',
    'dutifulness':'Dutifulness',
    'achievement':'Achievement',
    'self-discipline':'Self-Discipline',
    'deliberation':'Cautiousness',
    'cautiousness':'Cautiousness'
  },
  N: {
    'anxiety':'Anxiety',
    'angry hostility':'Anger',
    'anger':'Anger',
    'depression':'Depression',
    'self-consciousness':'Self-Consciousness',
    'impulsiveness':'Immoderation',
    'immoderation':'Immoderation',
    'vulnerability':'Vulnerability'
  }
};

function normFacetLabel(s:string){
  return String(s||'').toLowerCase().trim();
}

// Extract facet buckets per domain from results
function extractFacetBuckets(payload:any): Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> | null {
  const results: any[] = Array.isArray(payload?.results) ? payload.results : [];
  const out: Partial<Record<DomainKey, Record<string,'High'|'Medium'|'Low'>>> = {};
  for (const r of results){
    const d = r?.domain as DomainKey;
    if (!['O','C','E','A','N'].includes(String(d))) continue;
    const bucket = r?.payload?.final?.bucket;
    if (bucket && typeof bucket === 'object'){
      out[d] = bucket as any;
    }
  }

  if (Object.keys(out).length) return out as Record<DomainKey, Record<string,'High'|'Medium'|'Low'>>;

  // Fallback: derive buckets from phase2 raw facet scores (1..5 -> 0..1 -> H/M/L)
  const derived: Partial<Record<DomainKey, Record<string,'High'|'Medium'|'Low'>>> = {};
  for (const r of results){
    const d = r?.domain as DomainKey;
    if (!['O','C','E','A','N'].includes(String(d))) continue;
    const raw = r?.payload?.phase2?.A_raw;
    if (raw && typeof raw === 'object'){
      const map: Record<string,'High'|'Medium'|'Low'> = {};
      for (const [facet, val] of Object.entries(raw)){
        const num = Number(val);
        const norm = isFinite(num) ? Math.max(0, Math.min(1, (num - 1) / 4)) : 0.5; // 1..5 -> 0..1
        const bucket: 'High'|'Medium'|'Low' = norm >= 0.67 ? 'High' : (norm < 0.34 ? 'Low' : 'Medium');
        map[facet] = bucket;
      }
      derived[d] = map;
    }
  }
  return Object.keys(derived).length ? derived as Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> : null;
}

// Extract normalized domain means (0..1). Prefers final facet buckets; falls back to phase2 raw if present.
function extractDomainMeansNormalized(payload:any): Record<DomainKey, number> {
  const results: any[] = Array.isArray(payload?.results) ? payload.results : [];
  const out: Record<DomainKey, number> = { O: 0.5, C: 0.5, E: 0.5, A: 0.5, N: 0.5 };

  const bucketToNum = (b:any)=> b==='High' ? 1 : b==='Medium' ? 0.5 : b==='Low' ? 0 : 0.5;

  for (const r of results){
    const d = r?.domain as DomainKey;
    if (!['O','C','E','A','N'].includes(String(d))) continue;

    // 1) Prefer final facet buckets
    const bucket = r?.payload?.final?.bucket;
    if (bucket && typeof bucket === 'object'){
      const vals = Object.values(bucket).map(bucketToNum);
      if (vals.length){
        out[d] = vals.reduce((a:number,b:number)=> a+b, 0) / vals.length;
        continue;
      }
    }

    // 2) Fallback to phase2 raw facet scores (assume 1..5 scale -> normalize to 0..1)
    const raw = r?.payload?.phase2?.A_raw;
    if (raw && typeof raw === 'object'){
      const vals = Object.values(raw).map((x:any)=>{
        const num = Number(x);
        if (!isFinite(num)) return 0.5;
        const norm = (num - 1) / 4; // map 1..5 to 0..1
        return Math.max(0, Math.min(1, norm));
      });
      if (vals.length){
        out[d] = vals.reduce((a:number,b:number)=> a+b, 0) / vals.length;
      }
    }
  }

  return out;
}

function bucketToValue(b:'High'|'Medium'|'Low'): number { return b==='High'?1: b==='Medium'?0.5: 0; }

function computeCardAvgFacets(card:any, facetBuckets: Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> | null): number {
  if (!facetBuckets) return 0.5;
  const maps: any[] = Array.isArray(card?.big_five_map) ? card.big_five_map : [];
  let totalWeight = 0;
  let sum = 0;
  
  console.log('Override Card Debug - computeCardAvgFacets:', {
    cardTitle: card?.title || card?.id,
    facetBuckets: facetBuckets,
    maps: maps
  });
  
  for (const m of maps){
    const dk = domainToKey[m?.domain || ''] as DomainKey;
    const dir = String(m?.direction || 'direct');
    const facs: string[] = Array.isArray(m?.facets) ? m.facets : [];
    for (const f of facs){
      const canon = FACET_SYNONYMS[dk]?.[normFacetLabel(f)] || f; // fall back to original label
      const b = facetBuckets[dk]?.[canon];
      if (!b) continue;
      let v = bucketToValue(b);
      if (dir === 'inverse') v = 1 - v; // invert
      const w = dir === 'support' ? 0.5 : 1.0; // support has lower weight
      sum += v * w;
      totalWeight += w;
      
      console.log('Override Card Facet Calculation:', {
        cardTitle: card?.title || card?.id,
        domain: m?.domain,
        facet: f,
        canonical: canon,
        bucket: b,
        bucketValue: bucketToValue(b),
        direction: dir,
        finalValue: v,
        weight: w,
        contribution: v * w
      });
    }
  }
  
  const result = totalWeight>0 ? (sum / totalWeight) : 0.5;
  console.log('Override Card Final Average:', {
    cardTitle: card?.title || card?.id,
    sum: sum,
    totalWeight: totalWeight,
    average: result
  });
  
  return result;
}

function computeCardAvg(card: any, dmOrFacet: any): number {
  // Prefer facet-based scoring if buckets available
  if (dmOrFacet && dmOrFacet.__type === 'facetBuckets'){ return computeCardAvgFacets(card, dmOrFacet.map); }
  // Fallback: previous domain-mean approach
  const dm = dmOrFacet as Record<DomainKey, number> | null;
  if (!dm) return 0.5;
  const maps: any[] = Array.isArray(card?.big_five_map) ? card.big_five_map : [];
  let totalWeight = 0; let score = 0;
  for (const m of maps){
    const key = domainToKey[m?.domain || ''] as DomainKey;
    const val = dm[key]; if (typeof val !== 'number') continue;
    const dir = String(m?.direction || 'direct');
    const weight = 1.0;
    const dirScore = dir === 'inverse' ? (1 - val) : val;
    score += dirScore * weight; totalWeight += weight;
  }
  return totalWeight>0 ? score/totalWeight : 0.5;
}

function scoreCardLevel(card: any, dmOrFacet: any): 'high'|'medium'|'low' {
  const avg = computeCardAvg(card, dmOrFacet);
  if (avg >= 0.67) return 'high';
  if (avg < 0.34) return 'low';
  return 'medium';
}

function starsForAvg(avg: number): number {
  let stars;
  if (avg >= 0.67) stars = 5;
  else if (avg < 0.34) stars = avg < 0.17 ? 1 : 2;
  else stars = avg < 0.5 ? 3 : 4;
  
  console.log('Override Card Stars Calculation:', {
    average: avg,
    stars: stars,
    threshold: avg >= 0.67 ? '5 stars (>=0.67)' : avg < 0.34 ? (avg < 0.17 ? '1 star (<0.17)' : '2 stars (0.17-0.34)') : (avg < 0.5 ? '3 stars (0.34-0.5)' : '4 stars (0.5-0.67)')
  });
  
  return stars;
}

// Removed field presence cards; cards now represent the five domains

// Removed unused SVG star component; using simple Stars renderer

function YourIdContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get('rid');
  const [accentColor, setAccentColor] = useState('');
  const [archetypeName, setArchetypeName] = useState<string>('');
  const [domainMeans, setDomainMeans] = useState<Record<DomainKey, number> | null>(null);
  const [facetBuckets, setFacetBuckets] = useState<Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fullResults, setFullResults] = useState<Array<{domain:DomainKey; payload:any}> | null>(null);
  const [whoData, setWhoData] = useState<any|null>(null);
  const [panels, setPanels] = useState<any|null>(null);
  const [modalDomain, setModalDomain] = useState<DomainKey|null>(null);
  const [headerOpen, setHeaderOpen] = useState<boolean>(false);
  const [archetypeDescription, setArchetypeDescription] = useState<{title: string; text: string}[]>([]);
  const [wowByDomain, setWowByDomain] = useState<null | Record<DomainKey, Array<{name:string; score:number; domain_mean:number; pattern:string; reason:{contrast:number; visibility:number; extreme:boolean}}>>>(null);
  const [shareStatus, setShareStatus] = useState<'idle'|'copied'|'error'>('idle');
  const [previewModal, setPreviewModal] = useState<any | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setModalDomain(null);
        setPreviewModal(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleDownloadJson = () => {
    if (fullResults) {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(fullResults, null, 2)
      )}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `ground_zero_results_${rid}.json`;
      link.click();
    }
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('capture-root');
    if (element && fullResults) {
      setIsCapturing(true);
      // Wait for React to re-render and hide the conflict patterns section
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const html2canvas = await loadHtml2Canvas();
      const { jsPDF } = await import('jspdf');

      if (!html2canvas) {
        console.error('html2canvas not loaded');
        setIsCapturing(false);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2, // Higher scale for better quality
        backgroundColor: '#000000',
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);

      pdf.save(`ground_zero_results_${rid}.pdf`);
      setIsCapturing(false);
    }
  };

  const emojiMap: Record<DomainKey, string> = { O:'🎨', C:'✅', E:'⚡', A:'🤝', N:'🛡️' };
  const GOLD = '#d4af37';
  const imageMap: Record<DomainKey, string> = {
    A: '/agree.png',
    C: '/conci.png',
    E: '/extra.png',
    N: '/neur.png',
    O: '/open.png'
  };

  useEffect(()=>{ import("@/lib/data/who_panels.json").then(m=> setPanels((m as any).default || m)); }, []);

  // Map canonical facet labels to the visibility keys used by wow selector
  function toVisibilityKey(d: DomainKey, name: string): string {
    const map: Partial<Record<DomainKey, Record<string,string>>> = {
      O: { 'Artistic Interests':'Artistic' },
      E: { 'Activity Level':'Activity', 'Positive Emotions':'Cheerfulness' },
      A: { 'Straightforwardness':'Morality', 'Compliance':'Cooperation', 'Tender-Mindedness':'Sympathy' },
      C: { 'Competence':'Self-Efficacy', 'Deliberation':'Cautiousness', 'Order':'Orderliness' },
      N: { 'Angry Hostility':'Anger', 'Impulsiveness':'Immoderation' }
    };
    const table = map[d] || {};
    return table[name] || name;
  }

  // Map wow selector facet name -> wow.json bank facet key (lowercase, specific hyphens)
  function wowNameToBankKey(d: DomainKey, name: string): string {
    const n = String(name || '').toLowerCase();
    const m: Partial<Record<DomainKey, Record<string,string>>> = {
      E: { 'activity':'activity level' },
      O: {},
      C: {},
      A: {},
      N: {}
    };
    const table = m[d] || {};
    return table[n] || n;
  }

  function domainProper(d: DomainKey): string {
    // Use DOMAINS labels like "Openness (O)" -> "Openness"
    return DOMAINS[d].label.split(' ')[0];
  }

  function lineForPick(d: DomainKey, pick: { name:string; pattern:string }): string | null {
    try{
      const dom = domainProper(d);
      const facetKey = wowNameToBankKey(d, pick.name);
      const domObj = (wowBank as any)[dom];
      const facetObj = domObj?.[facetKey];
      const text = facetObj?.[pick.pattern] || facetObj?.neutral;
      return typeof text === 'string' ? text : null;
    } catch { return null; }
  }

  function buildIdentityNarrativeFromWow(stanceLine?: string | null): string[] {
    if (!wowByDomain) return [];
    const picksOrdered: Array<{ d:DomainKey; p:any; priority:number }> = [];
    for (const d of ['O','C','E','A','N'] as DomainKey[]) {
      const arr = (wowByDomain as any)[d] as Array<any> | undefined;
      if (!arr || !arr.length) continue;
      // rank by composite approximation
      const ranked = [...arr].map(p=> ({
        p,
        priority: (p.reason?.contrast ?? 0)*100 + (p.reason?.extreme ? 20 : 0) + (p.reason?.visibility ?? 0)
      })).sort((a,b)=> b.priority - a.priority);
      // take top one for each domain first
      if (ranked[0]) picksOrdered.push({ d, p: ranked[0].p, priority: ranked[0].priority });
      // store others for overflow
      for (let i=1;i<ranked.length;i++) picksOrdered.push({ d, p: ranked[i].p, priority: ranked[i].priority - i });
    }
    // global sort, but keep first-pass domain coverage near the top
    picksOrdered.sort((a,b)=> b.priority - a.priority);

    const sentences: string[] = [];
    for (const item of picksOrdered) {
      const s = lineForPick(item.d, { name: item.p.name, pattern: item.p.pattern });
      if (s) sentences.push(s);
      if (sentences.length >= 6) break;
    }
    if (stanceLine && sentences.length < 7) sentences.push(stanceLine);
    return [sentences.join(' ')];
  }

  // Identity narrative builder (mirrors Who page selection/compression)
  function buildIdentityNarrativeFromWhoNarrative(narr: string[] | undefined | null, stanceLine?: string | null): string[] {
    const MAX_SENTENCES = 7;
    const MAX_FROM_NARR = 5;
    const MAX_WORDS = 16;
    const MIN_WORDS = 6;
    const SOFTENERS = /\b(very|really|quite|somewhat|often|usually|maybe|perhaps|a bit|kind of|sort of)\b/gi;
    const FILLERS = /\b(that|just|actually|literally)\b/gi;
    const BOILERPLATE_DOMAIN = /^\s*Your\s+(Openness|Conscientiousness|Extraversion|Agreeableness|Neuroticism)\s+is\b/i;
    const TOKENS = [
      { rx:/\bopenness\b/i, facets:[/imagin/i,/creativ/i,/ideas?/i,/beauty|art|music|literature|nature/i] },
      { rx:/\bconscientiousness\b/i, facets:[/reliable|reliab/i,/execution|deliver|finish/i,/lanes?|scope|SOP/i] },
      { rx:/\bextraversion\b/i, facets:[/tempo|momentum|visible|energ/i,/lead|initiat/i] },
      { rx:/\bagreeableness\b/i, facets:[/goodwill|trust|warm/i,/convert|align|coalition/i] },
      { rx:/\bneuroticism\b/i, facets:[/signals?|worry|anxiety|overload|frustration/i,/buffers?|resets?|guardrails?/i] }
    ];

    function splitSentences(text:string): string[] {
      return (text||'')
        .replace(/\s+/g,' ')
        .split(/(?<=[.!?])\s+/)
        .map(s=>s.trim())
        .filter(Boolean);
    }
    function clampWords(s:string): string {
      const words = s
        .replace(SOFTENERS,'')
        .replace(FILLERS,'')
        .replace(/\s+/g,' ')
        .trim()
        .split(' ');
      if (words.length <= MAX_WORDS) return words.join(' ');
      return words.slice(0, MAX_WORDS).join(' ') + '.';
    }
    function scoreSentence(s:string): number {
      let score = 0;
      for (const t of TOKENS) {
        if (t.rx.test(s)) score += 1;
        for (const f of t.facets) if (f.test(s)) score += 3;
      }
      if (/\b(tight cycles?|buffers?|resets?|guardrails?|boundar(y|ies))\b/i.test(s)) score += 2;
      if (/\b(define|commit|ship|move|drop scope|restart|request)\b/i.test(s)) score += 1;
      if (/\b(composed\s+force|regain\s+control|reliable\s+execution|set\s+tempo|momentum\s+visible)\b/i.test(s)) score += 2;
      return score;
    }

    const n0 = Array.isArray(narr) ? narr.slice(0,5).join(' ') : '';
    const n1 = Array.isArray(narr) ? narr.slice(5,10).join(' ') : '';
    const n2 = Array.isArray(narr) ? narr.slice(10).join(' ') : '';
    let candidates = [...splitSentences(n0), ...splitSentences(n1), ...splitSentences(n2)];
    candidates = candidates.filter(s => {
      const w = s.trim().split(/\s+/).filter(Boolean).length;
      if (w < MIN_WORDS) return false;
      if (BOILERPLATE_DOMAIN.test(s)) return false;
      if (/^heat\.?$/i.test(s)) return false;
      return true;
    });

    const ranked = candidates
      .map((s,idx)=>({ s, idx, score: scoreSentence(s) }))
      .sort((a,b)=> b.score - a.score || a.idx - b.idx);

    const picked: string[] = [];
    const used = new Set<number>();
    for (const t of TOKENS) {
      let bestIdx = -1; let bestScore = -Infinity;
      ranked.forEach((r,i)=>{
        if (used.has(i)) return;
        if (t.rx.test(r.s) || t.facets.some(f=> f.test(r.s))) {
          if (r.score > bestScore) { bestScore = r.score; bestIdx = i; }
        }
      });
      if (bestIdx >= 0) { picked.push(ranked[bestIdx].s); used.add(bestIdx); }
      if (picked.length >= MAX_FROM_NARR) break;
    }
    for (let i=0; i<ranked.length && picked.length<MAX_FROM_NARR; i++){
      if (used.has(i)) continue;
      const s = ranked[i].s;
      if (/heat plus direction equals motion/i.test(s)) continue;
      picked.push(s);
      used.add(i);
    }

    const compressed = picked.map(clampWords);
    const finalSentences: string[] = [];
    for (const s of compressed) { if (finalSentences.length < 6) finalSentences.push(s); }
    if (stanceLine && finalSentences.length < MAX_SENTENCES) finalSentences.push(stanceLine);
    if (!finalSentences.length) finalSentences.push('You set direction and move work to done.');
    return [finalSentences.join(' ')];
  }

  function computeStanceLine(): string | null {
    try{
      const dm = whoData?.derived?.domainMeans as Record<DomainKey, number> | undefined;
      const states = whoData?.states as Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> | undefined;
      if (!dm || !states || !panels) return null;
      const Ehigh = (dm.E ?? 0) >= 4.0, Elow = (dm.E ?? 0) <= 2.0;
      const Ahigh = (dm.A ?? 0) >= 4.0, Alow = (dm.A ?? 0) <= 2.0;
      let interpersonalKey: string;
      if (Ehigh && Ahigh) interpersonalKey = 'warm_energizing';
      else if (Ehigh && Alow) interpersonalKey = 'forceful_independent';
      else if (Elow && Ahigh) interpersonalKey = 'calm_considerate';
      else if (Elow && Alow) interpersonalKey = 'autonomous_direct';
      else interpersonalKey = 'adaptive_balanced';

      const tone = (whoData?.tone || 'neutral') as string;
      const withTone = (panel:any)=>{
        if (!panel) return panel;
        const v = panel.tones?.[tone];
        if (!v) return panel;
        return { ...panel, title: v.title ?? panel.title, lines: Array.isArray(v.lines) ? v.lines : panel.lines };
      };
      const p = withTone(panels?.interpersonal?.[interpersonalKey]);
      const label = String(p?.title || 'Adaptive');
      let l0 = String((p?.lines || [])[0] || '').replace(/\s+/g,' ').trim();
      // Merge smoothly into one sentence as Who page does
      l0 = l0.replace(/^[Yy]ou\s+/, 'you ');
      const stance = label ? label.toLowerCase() : 'adaptive';
      if (!l0) return `Your stance with people is ${stance}.`;
      return `Your stance with people is ${stance} and ${l0}`;
    } catch { return null; }
  }

  function computeHeaderProofLine(): string {
    try{
      const rid = (whoData?.audit?.runHash) || '';
      const hash = (whoData?.audit?.checksum) || rid;
      const weeklyFinishers =  (typeof window !== 'undefined' && hash)
        ? (function(seed:string){
            let h = 0 >>> 0; for (let i=0;i<seed.length;i++){ h = ((h*31) + seed.charCodeAt(i)) >>> 0; }
            const min=1000, max=2000, span = max-min+1; return min + (h % span);
          })(String(hash))
        : 0;
      return weeklyFinishers
        ? `This run is verified (hash ${hash}). This week, ${weeklyFinishers.toLocaleString()} people finished; you read yours now.`
        : `This run is verified.`;
    } catch { return `This run is verified.`; }
  }
  
  // Redesigned quick-scan ID card (scaffold)
  function renderRedesignedIdCard() {
    // 1) Core tension from top conflict card
    let coreLabel: string | null = null;
    let coreStars = 0;
    let conflictCard: any = null;
    if (fullResults) {
      const facets: Array<{domain:DomainKey; facet:string; raw:number; bucket:'High'|'Medium'|'Low'}> = [];
      for (const d of ['O','C','E','A','N'] as DomainKey[]) {
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
      if (cards.length) {
        conflictCard = cards[0];
        const avgPct = conflictCard.leftPct && conflictCard.rightPct ? (conflictCard.leftPct + conflictCard.rightPct)/2 : 50;
        coreStars = avgPct >= 80 ? 5 : avgPct >= 60 ? 4 : avgPct >= 40 ? 3 : avgPct >= 20 ? 2 : 1;
        coreLabel = String(conflictCard.facet || '').replace(/\s*vs\.?\s*/i, ' ←→ ');
      }
    }

    const conflictCardCount = fullResults ? selectFiveCards(fullResults.filter(r => ['O', 'C', 'E', 'A', 'N'].includes(r.domain)).flatMap(r => canonicalFacets(r.domain).map(f => ({
      domain: r.domain,
      facet: f,
      raw: Number((r.payload?.phase2?.A_raw || {})[f] ?? 3),
      bucket: (r.payload?.final?.bucket || {})[f] || 'Medium'
    })))).filter((c:any)=> c.type==='conflict').length : 0;

    // 2) Domain snapshot (grouped)
    function DomainSnapshot(){
      if (!domainMeans) return null;
      const level = (v:number)=> v>=0.67 ? 'HIGH' : (v<0.34 ? 'LOW' : 'MEDIUM');
      const highs: string[] = []; const meds: string[] = []; const lows: string[] = [];
      const label = (d:DomainKey)=> DOMAINS[d].label.split(' (')[0];
      (['O','C','E','A','N'] as DomainKey[]).forEach(d=>{
        const v = domainMeans[d] ?? 0.5;
        const lvl = level(v);
        if (lvl==='HIGH') highs.push(label(d));
        else if (lvl==='MEDIUM') meds.push(label(d));
        else lows.push(label(d));
      });
      return (
        <div className="text-xs">
          <div className="text-white/70 mb-0.5" style={{letterSpacing:0.5}}>DOMAIN SNAPSHOT</div>
          {highs.length ? (<div className="mb-0.5">🟢 <b>HIGH</b>: {highs.join(', ')}</div>) : null}
          {meds.length ? (<div className="mb-0.5">🟡 <b>MEDIUM</b>: {meds.join(', ')}</div>) : null}
          {lows.length ? (<div>🔴 <b>LOW</b>: {lows.join(', ')}</div>) : null}
        </div>
      );
    }

    // 3) Quick profile bullets (pulled from narrative + stance)
    function QuickProfile(){
      const narr: string[] = Array.isArray(whoData?.narrative) ? whoData!.narrative : [];
      const strengths = whoData?.listSentences?.strengths || [];
      const risks = whoData?.listSentences?.risks || [];
      const stance = computeStanceLine();
      const style = narr[0] || 'Adaptive leader who moves people';
      const strength = strengths[0] || 'Planning with precision';
      const struggle = risks[0] || 'Executing with confidence';
      const stanceLine = stance ? stance.replace(/^Your\s+stance\s+with\s+people\s+is\s*/i,'').replace(/\.$/,'') : 'Balanced skepticism — you believe but verify';
      return (
        <>
          <ul className="list-disc pl-3 text-white/90 text-xs space-y-0 inline-block text-left">
            <li className="mb-0.5"><b>Your Style</b>: {style}</li>
            <li className="mb-0.5"><b>Your Strength</b>: {strength}</li>
            <li className="mb-0.5"><b>Your Struggle</b>: {struggle}</li>
            <li className="mb-0.5">
              <b>Your Stance</b>: {stanceLine}
            </li>
          </ul>
          <div className="mt-2 flex justify-center">
            <CTAButton
              href="#"
              tier="Paid"
              onClick={(e) => {
                e.preventDefault();
                setPreviewModal({
                  title: 'Compatibility Report',
                  description: 'Unlock a detailed analysis of your interpersonal dynamics with one other person.',
                  previewContent: (
                    <div>
                      <h4 className="font-bold text-lg text-yellow-300">How You Interact</h4>
                      <p className="mt-2 text-white/90 text-sm">
                        This report reveals the precise points of harmony and friction between you and one other person, creating a playbook for better communication.
                      </p>
                      <p className="mt-2 text-xs italic text-white/70">
                        For example, we&apos;ll show you how your High Neuroticism might sync or clash with their personality.
                      </p>
                    </div>
                  ),
                  price: 3.00,
                  purchaseUrl: `/compatibility${rid ? `?ridA=${rid}` : ''}`,
                  unlocks: 'The full report includes a detailed breakdown of your domain synergy, conflict patterns, and a playbook for better communication.'
                });
              }}
            >
              See how this impacts your relationships
            </CTAButton>
          </div>
        </>
      );
    }

    // A small component to render the conflict pattern preview
    const ConflictPatternPreview = ({ card }: { card: any }) => {
      if (!card) return <p className="text-white/70">Your conflict pattern data will be shown here.</p>;
      return (
        <div>
          <h4 className="font-bold text-lg text-yellow-300">{card.facet}</h4>
          {card.explanation && <p className="mt-2 text-white/90 text-sm">{card.explanation}</p>}
          {card.friction && <p className="mt-2 text-xs italic text-white/70">{card.friction}</p>}
        </div>
      );
    };

    // 4) Key insight (short pull-quote from narrative)
    function KeyInsight(){
      const narr: string[] = Array.isArray(whoData?.narrative) ? whoData!.narrative : [];
      const baseQuote = narr[3] || 'You present confidently while your inner critic takes notes. Range is your advantage; diffusion is your risk.';
      const enhancedQuote = baseQuote.replace(/Use\s+tight\s+cycles\s+to\s+regain\s+control/i,
        (m)=> `${m} (e.g., break overwhelming projects into 25-minute focused sprints)`
      );
      return (
        <blockquote className="text-white/90 text-xs italic border-l pl-1.5 border-white/20 leading-snug">
          "{enhancedQuote}"
        </blockquote>
      );
    }

    return (
      <div id="id-card" className="rounded-lg border border-white/10 bg-white/5 p-1.5 sm:p-2" style={{ ...neonBorderStyle(), maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="mb-1">
          <div className="text-xs text-white/70" style={{letterSpacing:.5}}>🎯 YOUR GROUND ZERO PROFILE</div>
          {archetypeName && (
            <div className="w-10 sm:w-16 mx-auto mb-1 flex-shrink-0">
              <Image 
                src={`/${archetypeName.toLowerCase()}.png`} 
                alt={`${archetypeName} emblem`} 
                width={64}
                height={64}
                className="w-full object-contain"
                priority
              />
            </div>
          )}
          {archetypeName ? <div className="text-base font-extrabold" style={{ color: accentColor }}>{archetypeName.toUpperCase()}</div> : null}
        </div>

        <hr className="border-white/10 my-0.5" />

        {archetypeDescription.length > 0 && (
          <div className="my-1 p-2 sm:p-2.5 rounded-lg" style={neonBorderStyle()}>
            <div className="text-center">
              <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 sm:mb-2 leading-tight" style={{ color: accentColor }}>
                YOUR ARCTYPE PSYCOLOGY
              </h3>
              <div className="text-white/90 text-xs sm:text-sm space-y-1.5 leading-snug">
                {archetypeDescription.map((part, index) => (
                  <div key={index} className="space-y-0.5">
                    <h4 className="font-semibold text-white text-xs sm:text-sm tracking-wide uppercase" style={{ letterSpacing: '0.05em' }}>
                      {part.title}
                    </h4>
                    <p className="text-white/85 text-xs sm:text-sm leading-snug">
                      {part.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="my-1 p-2 sm:p-2.5 rounded-lg" style={neonBorderStyle()}>
          <div className="text-center">
            <h3 className="text-sm sm:text-base font-bold text-white mb-1.5 sm:mb-2 leading-tight" style={{ color: accentColor }}>
              🎭 QUICK PROFILE
            </h3>
            <div className="text-center">
              <QuickProfile />
            </div>
          </div>
        </div>

        <hr className="border-white/10 my-0.5" />

        <div className="mb-1">
          <div className="text-white/80 font-semibold mb-0.5 text-xs">🎯 KEY INSIGHT</div>
          <KeyInsight />
        </div>

        <hr className="border-white/10 my-0.5" />

        <Tooltip text="A unique signature for your results, ensuring they are verifiable.">
          <div className="mt-1 text-center text-xs text-white/50 cursor-pointer">
            <div className="font-semibold">RUN FINGERPRINT</div>
            <div>{whoData?.audit?.checksum || whoData?.audit?.runHash || rid}</div>
          </div>
        </Tooltip>

      </div>
    );
  }
  
  // Debug logging for domain card data
  console.log('Override Page Debug - Domain Cards:', {
    hasFullResults: !!fullResults,
    domains: ['O','C','E','A','N'],
  });

  // Build full domain summary content (mirrors FullResults)
  function renderDomainSummary(d: DomainKey, payload: any){
    const facets = canonicalFacets(d);
    const bucket = (payload?.final?.bucket || {}) as Record<string,'High'|'Medium'|'Low'>;
    const A_raw = (payload?.phase2?.A_raw || {}) as Record<string, number>;
    const domain_mean_raw = Number(payload?.final?.domain_mean_raw ?? 3);
    const lvlKey = String(getScoreLevel(domain_mean_raw)).replace('neutral','medium') as 'high'|'medium'|'low';
    const levelMeaning: Record<'high'|'medium'|'low', string> = {
      high: 'You can access this trait easily and consistently.',
      medium: 'You can turn this trait on when needed, but it isn’t your default.',
      low: d==='N' ? 'You keep an even keel and recover quickly under pressure.' : 'This trait stays in the background unless the situation forces it.'
    };
    const highs = facets.filter(f=> bucket[f]==='High').sort((a,b)=> (A_raw[b]-A_raw[a])).slice(0,2);
    const mids  = facets.filter(f=> bucket[f]==='Medium').sort((a,b)=> (Math.abs(3-(A_raw[a]??3)) - Math.abs(3-(A_raw[b]??3)))).slice(0,2);
    const lows  = facets.filter(f=> bucket[f]==='Low').sort((a,b)=> (A_raw[a]-A_raw[b])).slice(0,2);
    const isN = d==='N';
    const strengths = isN ? lows : highs;
    const development = isN ? highs : lows;
    const firstSentence = (txt:string|undefined)=> txt ? (txt.split(/(?<=\.)\s+/)[0] || txt).trim() : '';
    return (
      <div className="text-sm text-white/90 leading-relaxed">
        <div className="mb-1">Your overall level is <b className="capitalize">{lvlKey}</b>. {levelMeaning[lvlKey]}</div>
        <div className="mb-2">Domain average: <b>{domain_mean_raw.toFixed(2)} / 5</b></div>
        {strengths.length ? (
          <div className="mb-2">
            <div className="text-white/70 mb-1">Strong behavior levers</div>
            <ul className="list-disc pl-4">
              {strengths.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.[(isN?'low':'high')])}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {mids.length ? (
          <div className="mb-2">
            <div className="text-white/70 mb-1">Workable levers</div>
            <ul className="list-disc pl-4">
              {mids.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.medium)}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {development.length ? (
          <div className="mb-1">
            <div className="text-white/70 mb-1">Development levers</div>
            <ul className="list-disc pl-4">
              {development.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.[(isN?'high':'low')])}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  }
  // Neon border helper using accent color
  function neonBorderStyle(){
    const glow = hexToRgba(accentColor || '#4cafef', 0.6);
    const wide = hexToRgba(accentColor || '#4cafef', 0.25);
    const border = hexToRgba(accentColor || '#4cafef', 0.5);
    return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
  }
  function goldBorderStyle(){
    const glow = 'rgba(212,175,55,0.6)';
    const wide = 'rgba(212,175,55,0.25)';
    const border = 'rgba(212,175,55,0.5)';
    return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
  }

  async function loadHtml2Canvas(): Promise<any>{
    if (typeof window === 'undefined') return null;
    const w = window as any;
    if (w.html2canvas) return w.html2canvas;
    await new Promise<void>((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
      s.async = true;
      s.onload = ()=> resolve();
      s.onerror = ()=> reject(new Error('failed to load html2canvas'));
      document.head.appendChild(s);
    });
    return (window as any).html2canvas;
  }

  async function capturePageScreenshot(): Promise<File|null>{
    setIsCapturing(true);
    try{
      const html2canvas = await loadHtml2Canvas();
      if (!html2canvas) {
        setIsCapturing(false);
        return null;
      }
      const el = document.getElementById('capture-root') as HTMLElement;
      if (!el) {
        setIsCapturing(false);
        return null;
      }
      
      const canvas = await html2canvas(el, {
        backgroundColor: '#000000',
        scale: window.devicePixelRatio * 2, // Increase scale for better quality
        useCORS: true,
      });

      const blob: Blob|null = await new Promise(resolve=> canvas.toBlob(resolve, 'image/png', 0.95)); // Use higher quality PNG
      
      setIsCapturing(false);

      if (!blob) return null;
      return new File([blob], 'ground-zero-id.png', { type: 'image/png' });
    } catch {
      setIsCapturing(false);
      return null;
    }
  }
  
  console.log('Override Page Debug - Data State:', {
    rid: rid,
    archetypeName: archetypeName,
    domainMeans: domainMeans,
    facetBuckets: facetBuckets,
    hasFacetBuckets: !!facetBuckets
  });

  useEffect(() => {
    if (!rid) return;

    (async () => {
      try {
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();

        console.log('Override Page Debug - Raw API payload:', data);

        // Mirror who/page.tsx logic to resolve archetype name
        const whoObj = data?.who ?? {};
        const results = Array.isArray(data?.results) ? data.results : [];

        let archName: string | undefined;
        // 1) direct string
        if (typeof whoObj?.archetype === 'string') archName = String(whoObj.archetype);
        // 2) object with winner
        if (!archName && typeof whoObj?.archetype === 'object' && whoObj?.archetype?.winner) archName = String(whoObj.archetype.winner);
        // 3) fallback from results array (domain === 'ARCH')
        if (!archName) {
          const archPayload = results.find((r: any) => r?.domain === 'ARCH')?.payload;
          if (typeof archPayload === 'string') archName = archPayload;
          else if (archPayload?.winner) archName = String(archPayload.winner);
        }

        if (archName) {
          setArchetypeName(archName);
          // Match using gz (display) or id (slug)
          const match = (archetypeRules as any).archetypes.find((a: any) => {
            const gz = String(a?.gz || '').toLowerCase();
            const id = String(a?.id || '').toLowerCase();
            const target = String(archName).toLowerCase();
            return gz === target || id === target;
          });
          if (match?.color?.hex) setAccentColor(match.color.hex);
        }

        if (archName) {
          const atlas = (archetypeAtlas as any);
          // Format archName to match the keys in the atlas (e.g., "sovereign" -> "Sovereign")
          const formattedArchName = archName.charAt(0).toUpperCase() + archName.slice(1).toLowerCase();
          const archetypeData = atlas[formattedArchName];
          if (archetypeData) {
            const getFirstSentence = (text: string) => {
                if (!text) return '';
                const sentences = text.split(/(?<=[.!?])\s+/);
                return sentences[0] || '';
            };

            const descriptionParts = [
                { title: 'Psychological Profile', text: getFirstSentence(archetypeData.psychologicalProfile) },
                { title: 'Origin', text: getFirstSentence(archetypeData.origin) },
                { title: 'Inner Conflict', text: getFirstSentence(archetypeData.innerConflict) },
                { title: 'Field Presence', text: getFirstSentence(archetypeData.fieldPresence) }
            ];
            
            setArchetypeDescription(descriptionParts.filter(part => part.text));
          }
        }

        // Extract domain means and facet buckets
        const dm = extractDomainMeansNormalized(data);
        const fb = extractFacetBuckets(data);
        setDomainMeans(dm);
        setFacetBuckets(fb);
        setFullResults(results);
        setWhoData(data?.who || null);
        console.log('Override Page Debug - Extracted Means and Buckets:', { dm, fb });
        setIsReady(true);

        // Build wow facets for narrative highlights
        try {
          const meansRaw: Record<DomainKey, number> = { O:3, C:3, E:3, A:3, N:3 } as any;
          const byDomain: WowFacetsByDomain = { O:[], C:[], E:[], A:[], N:[] } as any;
          for (const d of ['O','C','E','A','N'] as DomainKey[]) {
            const entry = results.find((r:any)=> r.domain===d)?.payload;
            if (!entry) continue;
            const dmRaw = Number(entry?.final?.domain_mean_raw);
            if (Number.isFinite(dmRaw)) meansRaw[d] = dmRaw;
            const raw = (entry?.phase2?.A_raw || {}) as Record<string, number>;
            let idx = 0;
            for (const f of canonicalFacets(d)){
              const score = Number(raw?.[f] ?? 3);
              const visKey = toVisibilityKey(d, f);
              byDomain[d].push({ name: visKey, score, idx: idx++ });
            }
          }
          const runId = String((data?.who?.audit?.runHash) || (data?.who?.audit?.checksum) || rid || 'rid');
          const wow = await selectWowFacets(byDomain, meansRaw, runId);
          setWowByDomain(wow as any);
        } catch (e) {
          console.warn('Wow facets selection failed', e);
          setWowByDomain(null);
        }
      } catch {}
    })();
  }, [rid]);

  if (!isReady) return null;

  const glowColor = hexToRgba(accentColor || '#000000', 0.7);
  const cardBgColor = hexToRgba(accentColor || '#000000', 0.1);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-start sm:justify-center p-2 sm:p-4">
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
      
      {/* Redesigned, scannable ID card */}
      <div id="capture-root" className="my-4 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        {renderRedesignedIdCard()}
      </div>
      <Tooltip text="You can use this ID on the homepage to view your results again at any time.">
        <div className="text-xs text-white/40 font-mono mb-4 cursor-pointer">
          Run ID: {rid}
        </div>
      </Tooltip>
      {/* Share (kept) */}
      {!isCapturing && (
        <div className="pb-8">
          {/* Big Share button under the section */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={async ()=>{
                try{
                  const landingUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '';
                  const file = await capturePageScreenshot();
                  if (file && (navigator as any)?.canShare && (navigator as any).canShare({ files:[file] })){
                    await (navigator as any).share({ title: 'Ground Zero', url: landingUrl, files: [file] });
                    setShareStatus('copied');
                    setTimeout(()=> setShareStatus('idle'), 1500);
                    return;
                  }
                  if ((navigator as any)?.share){
                    await (navigator as any).share({ title: 'Ground Zero', url: landingUrl });
                    setShareStatus('copied');
                    setTimeout(()=> setShareStatus('idle'), 1500);
                  } else if (navigator?.clipboard && landingUrl){
                    await navigator.clipboard.writeText(landingUrl);
                    setShareStatus('copied');
                    setTimeout(()=> setShareStatus('idle'), 1500);
                  }
                } catch {
                  setShareStatus('error');
                  setTimeout(()=> setShareStatus('idle'), 1500);
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-black bg-gradient-to-r from-yellow-400 to-amber-500 border-2 border-yellow-500 shadow-lg shadow-yellow-500/50 hover:from-yellow-300 hover:to-amber-400 transition-all disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
              </svg>
              <span>{shareStatus==='copied' ? 'Copied!' : shareStatus==='error' ? 'Error' : 'Share Your ID'}</span>
            </button>
          </div>
          <div className="mt-3 flex justify-center">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all"
              style={{ 
                backgroundColor: accentColor || '#4cafef',
              }}
              onMouseEnter={(e) => {
                const color = accentColor || '#4cafef';
                if (color && color.startsWith('#')) {
                  const r = parseInt(color.slice(1, 3), 16);
                  const g = parseInt(color.slice(3, 5), 16);
                  const b = parseInt(color.slice(5, 7), 16);
                  const darkerR = Math.max(0, r - 20);
                  const darkerG = Math.max(0, g - 20);
                  const darkerB = Math.max(0, b - 20);
                  e.currentTarget.style.backgroundColor = `rgb(${darkerR}, ${darkerG}, ${darkerB})`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = accentColor || '#4cafef';
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              <span>Download Results (PDF)</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Modal for domain summary */}
      {modalDomain && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={()=> setModalDomain(null)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="rounded-xl border relative max-w-xl w-[92%]"
            style={{ background: '#0f141a', ...neonBorderStyle() }}
            onClick={(e)=> e.stopPropagation()}
          >
            <button
              onClick={()=> setModalDomain(null)}
              aria-label="Close"
              className="absolute top-2 right-2 px-2 py-1 text-white/70 hover:text-white"
            >×</button>
            <div className="p-6">
              <div className="mb-3 text-xl font-bold flex items-center" style={{ color: accentColor }}>
                {imageMap[modalDomain as DomainKey] ? (
                  <Image src={encodeURI(imageMap[modalDomain as DomainKey])} alt="" width={40} height={40} className="w-10 h-10 mr-3 object-cover" quality={95} />
                ) : (
                  <span className="mr-2" aria-hidden="true">{emojiMap[modalDomain as DomainKey]}</span>
                )}
                {DOMAINS[modalDomain].label.split(' (')[0]}
              </div>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
            {(() => {
                  const payload = (fullResults || []).find((r:any)=> r?.domain===modalDomain)?.payload;
                  return payload ? renderDomainSummary(modalDomain, payload) : (
                    <p className="text-white/70 text-sm">No data for this domain.</p>
                  );
            })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewModal && (
        <PaidContentPreviewModal
          {...previewModal}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </main>
  );
}

export default function YourIdPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <YourIdContent />
    </Suspense>
  );
}
