'use client';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CTAButton from '@/components/CTAButton';
import archetypeRules from "@/arctyps rules.json";
import archetypeAtlas from "@/lib/data/archetype_atlas.json";
import { DOMAINS, canonicalFacets, FACET_INTERPRETATIONS } from "@/lib/bigfive/constants";
import { getScoreLevel } from "@/lib/bigfive/format";
import { selectFiveCards } from "@/lib/bigfive/fiveCardSelector";
import { selectWowFacets, type FacetsByDomain as WowFacetsByDomain } from "@/lib/bigfive/wowFacets";
import wowBank from "@/wow.json";
import PaidContentPreviewModal from '@/components/PaidContentPreviewModal';
import Tooltip from '@/components/Tooltip';
import DetailedResults from '@/components/assessment/DetailedResults';

// Hardcoded example result ID
const EXAMPLE_RID = '1b46e28411524e4f06ceb9f8';

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || hex.length < 7) return `rgba(76, 175, 239, ${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

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
        const norm = isFinite(num) ? Math.max(0, Math.min(1, (num - 1) / 4)) : 0.5;
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

    const bucket = r?.payload?.final?.bucket;
    if (bucket && typeof bucket === 'object'){
      const vals = Object.values(bucket).map(bucketToNum);
      if (vals.length){
        out[d] = vals.reduce((a:number,b:number)=> a+b, 0) / vals.length;
        continue;
      }
    }

    const raw = r?.payload?.phase2?.A_raw;
    if (raw && typeof raw === 'object'){
      const vals = Object.values(raw).map((x:any)=>{
        const num = Number(x);
        if (!isFinite(num)) return 0.5;
        const norm = (num - 1) / 4;
        return Math.max(0, Math.min(1, norm));
      });
      if (vals.length){
        out[d] = vals.reduce((a:number,b:number)=> a+b, 0) / vals.length;
      }
    }
  }

  return out;
}

function IdentityBlueprintContent() {
  const rid = EXAMPLE_RID;
  const [accentColor, setAccentColor] = useState('');
  const [archetypeName, setArchetypeName] = useState<string>('');
  const [domainMeans, setDomainMeans] = useState<Record<DomainKey, number> | null>(null);
  const [facetBuckets, setFacetBuckets] = useState<Record<DomainKey, Record<string,'High'|'Medium'|'Low'>> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [fullResults, setFullResults] = useState<Array<{domain:DomainKey; payload:any}> | null>(null);
  const [whoData, setWhoData] = useState<any|null>(null);
  const [panels, setPanels] = useState<any|null>(null);
  const [modalDomain, setModalDomain] = useState<DomainKey|null>(null);
  const [archetypeDescription, setArchetypeDescription] = useState<{title: string; text: string}[]>([]);
  const [wowByDomain, setWowByDomain] = useState<null | Record<DomainKey, Array<{name:string; score:number; domain_mean:number; pattern:string; reason:{contrast:number; visibility:number; extreme:boolean}}>>>(null);
  const [shareStatus, setShareStatus] = useState<'idle'|'copied'|'error'>('idle');
  const [previewModal, setPreviewModal] = useState<any | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [activeTab, setActiveTab] = useState<'id'|'summary'|'results'>('id');
  const [verifyStatus, setVerifyStatus] = useState<'idle'|'ok'|'fail'>('idle');

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

  const emojiMap: Record<DomainKey, string> = { O:'🎨', C:'✅', E:'⚡', A:'🤝', N:'🛡️' };
  const imageMap: Record<DomainKey, string> = {
    A: '/agree.png',
    C: '/conci.png',
    E: '/extra.png',
    N: '/neur.png',
    O: '/open.png'
  };

  useEffect(()=>{ import("@/lib/data/who_panels.json").then(m=> setPanels((m as any).default || m)); }, []);

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
      l0 = l0.replace(/^[Yy]ou\s+/, 'you ');
      const stance = label ? label.toLowerCase() : 'adaptive';
      if (!l0) return `Your stance with people is ${stance}.`;
      return `Your stance with people is ${stance} and ${l0}`;
    } catch { return null; }
  }

  function renderRedesignedIdCard() {
    let coreLabel: string | null = null;
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
        coreLabel = String(conflictCard.facet || '').replace(/\s*vs\.?\s*/i, ' ←→ ');
      }
    }

    const conflictCardCount = fullResults ? selectFiveCards(fullResults.filter(r => ['O', 'C', 'E', 'A', 'N'].includes(r.domain)).flatMap(r => canonicalFacets(r.domain).map(f => ({
      domain: r.domain,
      facet: f,
      raw: Number((r.payload?.phase2?.A_raw || {})[f] ?? 3),
      bucket: (r.payload?.final?.bucket || {})[f] || 'Medium'
    })))).filter((c:any)=> c.type==='conflict').length : 0;

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
          <div className="text-white/70 mb-1" style={{letterSpacing:0.5}}>DOMAIN SNAPSHOT</div>
          {highs.length ? (<div>🟢 <b>HIGH</b>: {highs.join(', ')}</div>) : null}
          {meds.length ? (<div>🟡 <b>MEDIUM</b>: {meds.join(', ')}</div>) : null}
          {lows.length ? (<div>🔴 <b>LOW</b>: {lows.join(', ')}</div>) : null}
        </div>
      );
    }

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
        <ul className="list-disc pl-4 text-white/90 text-xs space-y-0.5">
          <li><b>Your Style</b>: {style}</li>
          <li><b>Your Strength</b>: {strength}</li>
          <li><b>Your Struggle</b>: {struggle}</li>
          <li><b>Your Stance</b>: {stanceLine}</li>
        </ul>
      );
    }

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

    function KeyInsight(){
      const narr: string[] = Array.isArray(whoData?.narrative) ? whoData!.narrative : [];
      const baseQuote = narr[3] || 'You present confidently while your inner critic takes notes. Range is your advantage; diffusion is your risk.';
      const enhancedQuote = baseQuote.replace(/Use\s+tight\s+cycles\s+to\s+regain\s+control/i,
        (m)=> `${m} (e.g., break overwhelming projects into 25-minute focused sprints)`
      );
      return (
        <blockquote className="text-white/90 text-xs italic border-l pl-2 border-white/20">
          "{enhancedQuote}"
        </blockquote>
      );
    }

    return (
      <div id="id-card" className="rounded-lg border border-white/10 bg-white/5 p-2 sm:p-3" style={{ ...neonBorderStyle(), maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
        <div className="mb-2">
          <div className="text-sm text-white/70" style={{letterSpacing:.5}}>🎯 YOUR GROUND ZERO PROFILE NAVIGATOR ⚖️</div>
          {archetypeName ? <div className="text-lg font-extrabold" style={{ color: accentColor }}>{archetypeName.toUpperCase()}</div> : null}
        </div>

        <hr className="border-white/10 my-1" />

        {archetypeDescription.length > 0 && (
          <div className="my-2 p-2 sm:p-3 rounded-lg" style={neonBorderStyle()}>
            <div className="flex items-start gap-2 sm:gap-4">
              {archetypeName && (
                <div className="w-12 sm:w-20 flex-shrink-0">
                  <Image 
                    src={`/${archetypeName.toLowerCase()}.png`} 
                    alt={`${archetypeName} emblem`} 
                    width={80}
                    height={80}
                    className="w-full object-contain"
                    priority
                  />
                </div>
              )}
              <div className="flex-1 text-left">
                <h3 className="text-sm sm:text-base font-bold text-white mb-1 sm:mb-2" style={{ color: accentColor }}>
                  What is your <Tooltip text="An archetype is a psychological pattern, a symbolic representation of a core part of the human experience.">archetype?</Tooltip>
                  <span className="text-xs font-normal text-white/60 ml-2">(lore only, not diagnostic)</span>
                </h3>
                <div className="text-white/90 text-[10px] sm:text-xs space-y-1">
                  {archetypeDescription.map((part, index) => (
                    <p key={index}>
                      <b className="font-semibold text-white/80">{part.title}:</b> {part.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-2">
          <div className="text-white/80 font-semibold mb-1">🎭 QUICK PROFILE</div>
          <div className="inline-block text-left"><QuickProfile /></div>
        </div>

        <hr className="border-white/10 my-1" />

        <DomainSnapshot />

        <hr className="border-white/10 my-1" />

        <div className="mb-2">
          <div className="text-white/80 font-semibold mb-1 text-sm">🎯 KEY INSIGHT</div>
          <KeyInsight />
        </div>

        <hr className="border-white/10 my-1" />

        <Tooltip text="A unique signature for your results, ensuring they are verifiable.">
          <div className="mt-2 text-center text-xs text-white/50 cursor-pointer">
            <div className="font-semibold">RUN FINGERPRINT</div>
            <div>{whoData?.audit?.checksum || whoData?.audit?.runHash || rid}</div>
          </div>
        </Tooltip>

      </div>
    );
  }

  function renderDomainSummary(d: DomainKey, payload: any){
    const facets = canonicalFacets(d);
    const bucket = (payload?.final?.bucket || {}) as Record<string,'High'|'Medium'|'Low'>;
    const A_raw = (payload?.phase2?.A_raw || {}) as Record<string, number>;
    const domain_mean_raw = Number(payload?.final?.domain_mean_raw ?? 3);
    const lvlKey = String(getScoreLevel(domain_mean_raw)).replace('neutral','medium') as 'high'|'medium'|'low';
    const levelMeaning: Record<'high'|'medium'|'low', string> = {
      high: 'You can access this trait easily and consistently.',
      medium: 'You can turn this trait on when needed, but it isn\'t your default.',
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

  function neonBorderStyle(){
    const glow = hexToRgba(accentColor || '#4cafef', 0.6);
    const wide = hexToRgba(accentColor || '#4cafef', 0.25);
    const border = hexToRgba(accentColor || '#4cafef', 0.5);
    return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();

        const whoObj = data?.who ?? {};
        const results = Array.isArray(data?.results) ? data.results : [];

        let archName: string | undefined;
        if (typeof whoObj?.archetype === 'string') archName = String(whoObj.archetype);
        if (!archName && typeof whoObj?.archetype === 'object' && whoObj?.archetype?.winner) archName = String(whoObj.archetype.winner);
        if (!archName) {
          const archPayload = results.find((r: any) => r?.domain === 'ARCH')?.payload;
          if (typeof archPayload === 'string') archName = archPayload;
          else if (archPayload?.winner) archName = String(archPayload.winner);
        }

        if (archName) {
          setArchetypeName(archName);
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

        const dm = extractDomainMeansNormalized(data);
        const fb = extractFacetBuckets(data);
        setDomainMeans(dm);
        setFacetBuckets(fb);
        setFullResults(results);
        setWhoData(data?.who || null);
        setIsReady(true);

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
  }, []);

  if (!isReady) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg mb-2">Loading Free Results...</div>
        <div className="text-sm text-white/60">Fetching example profile data</div>
      </div>
    </div>
  );

  function renderSummaryContent() {
    if (!fullResults) return <div className="text-center p-8 text-white/70">Loading summary...</div>;
    
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Summary</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(['O','C','E','A','N'] as DomainKey[]).map(d => {
            const payload = fullResults.find(r => r.domain === d)?.payload;
            if (!payload) return null;
            return (
              <div
                key={d}
                className="rounded-lg border border-white/10 bg-white/5 p-4 cursor-pointer hover:bg-white/10 transition-all"
                onClick={() => setModalDomain(d)}
                style={neonBorderStyle()}
              >
                <div className="flex items-center gap-3 mb-3">
                  {imageMap[d] ? (
                    <Image src={imageMap[d]} alt="" width={40} height={40} className="w-10 h-10 object-cover" />
                  ) : (
                    <span className="text-2xl">{emojiMap[d]}</span>
                  )}
                  <h3 className="text-lg font-bold" style={{ color: accentColor }}>
                    {DOMAINS[d].label.split(' (')[0]}
                  </h3>
                </div>
                {renderDomainSummary(d, payload)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderFullResultsContent() {
    if (!fullResults) return <div className="text-center p-8 text-white/70">Loading full results...</div>;
    
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Full Results</h2>
        <DetailedResults
          data={fullResults}
          suiteHash={null}
          verifyStatus={verifyStatus}
          onVerify={() => setVerifyStatus('idle')}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-start sm:items-center p-2 sm:p-4">
      {/* Page Header */}
      <div className="w-full max-w-6xl mx-auto mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
          Your Free Results
        </h1>
        <p className="text-white/70 text-sm">
          This is what you get for free when you complete the Ground Zero assessment. See your ID card, domain summaries, and full detailed results below.
        </p>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-6xl mx-auto mb-6">
        <div className="flex justify-center gap-2 border-b border-white/10">
          <button
            onClick={() => setActiveTab('id')}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'id'
                ? 'border-b-2 border-yellow-400 text-yellow-300'
                : 'text-white/70 hover:text-white'
            }`}
          >
            ID Card
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'summary'
                ? 'border-b-2 border-yellow-400 text-yellow-300'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'results'
                ? 'border-b-2 border-yellow-400 text-yellow-300'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Full Results
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'id' && (
        <>
          <div id="capture-root" className="my-4 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            {renderRedesignedIdCard()}
          </div>
          <Tooltip text="This is an example ID card showing what your Ground Zero profile looks like.">
            <div className="text-xs text-white/40 font-mono mb-4 cursor-pointer">
              Example Run ID: {rid}
            </div>
          </Tooltip>
        </>
      )}
      
      {activeTab === 'summary' && renderSummaryContent()}
      
      {activeTab === 'results' && renderFullResultsContent()}
      
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

export default function IdentityBlueprintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <IdentityBlueprintContent />
    </Suspense>
  );
}
