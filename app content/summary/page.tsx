'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { DOMAINS, canonicalFacets, FACET_INTERPRETATIONS, type DomainKey } from '@/lib/bigfive/constants';
import CTAButton from '@/components/CTAButton';
import PaidContentPreviewModal from '@/components/PaidContentPreviewModal';
import Tooltip from '@/components/Tooltip';

function SummaryContent(){
  const searchParams = useSearchParams();
  const rid = searchParams.get('rid');
  const [fullResults, setFullResults] = useState<Array<{domain:DomainKey; payload:any}>|null>(null);
  const [modalDomain, setModalDomain] = useState<DomainKey|null>(null);
  const [accentColor, setAccentColor] = useState<string>('#d4af37');
  const [previewModal, setPreviewModal] = useState<any | null>(null);
  const [partnerRid, setPartnerRid] = useState('');
  const [expandAll, setExpandAll] = useState(true);

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

  const getTopTrait = () => {
    if (fullResults) {
      const means = fullResults.map(r => ({ domain: r.domain, mean: r.payload?.final?.domain_mean_raw || 3.0 }));
      means.sort((a,b) => Math.abs(3 - a.mean) - Math.abs(3 - b.mean));
      const mostExtreme = means[means.length - 1];
      if (mostExtreme) {
        const isHigh = mostExtreme.mean > 3.0;
        const domainName = DOMAINS[mostExtreme.domain]?.label.split(' (')[0] || 'trait';
        return `your ${isHigh ? 'High' : 'Low'} ${domainName}`;
      }
    }
    return 'your unique traits';
  };

  useEffect(()=>{
    if (!rid) return;
    (async ()=>{
      try{
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();
        setFullResults(Array.isArray(data?.results) ? (data.results as any) : null);
      } catch {}
    })();
  },[rid]);

  function neonBorderStyle(){
    const glow = 'rgba(212,175,55,0.6)';
    const wide = 'rgba(212,175,55,0.25)';
    const border = 'rgba(212,175,55,0.5)';
    return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
  }

  function renderDomainSummary(d: DomainKey, payload: any){
    const facets = canonicalFacets(d);
    const bucket = (payload?.final?.bucket || {}) as Record<string,'High'|'Medium'|'Low'>;
    const A_raw = (payload?.phase2?.A_raw || {}) as Record<string, number>;
    const domain_mean_raw = Number(payload?.final?.domain_mean_raw ?? 3);
    const lvlKey = (domain_mean_raw >= 4 ? 'high' : (domain_mean_raw <= 2 ? 'low' : 'medium')) as 'high'|'medium'|'low';
    const levelMeaning: Record<'high'|'medium'|'low', string> = {
      high: 'You can access this trait easily and consistently.',
      medium: 'You can turn this trait on when needed, but it isn’t your default.',
      low: d==='N' ? 'You keep an even keel and recover quickly under pressure.' : 'This trait stays in the background unless the situation forces it.'
    };
    const firstSentence = (txt:string|undefined)=> txt ? (txt.split(/(?<=\.)\s+/)[0] || txt).trim() : '';
    const highs = facets.filter(f=> bucket[f]==='High').sort((a,b)=> (A_raw[b]-A_raw[a])).slice(0,2);
    const mids  = facets.filter(f=> bucket[f]==='Medium').sort((a,b)=> (Math.abs(3-(A_raw[a]??3)) - Math.abs(3-(A_raw[b]??3)))).slice(0,2);
    const lows  = facets.filter(f=> bucket[f]==='Low').sort((a,b)=> (A_raw[a]-A_raw[b])).slice(0,2);
    const isN = d === 'N';
    const strengths = isN ? lows : highs;
    const development = isN ? highs : lows;

    return (
      <div className="text-sm text-white/90 leading-relaxed">
        <div className="mb-1">Your overall level is <b className="capitalize">{lvlKey}</b>. {levelMeaning[lvlKey]}</div>
        <div className="mb-2">Domain average: <b>{domain_mean_raw.toFixed(2)} / 5</b></div>
        {strengths.length > 0 && (
          <div className="mb-2">
            <div className="text-white/70 mb-1">Strong behavior levers</div>
            <ul className="list-disc pl-4">
              {strengths.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.[(isN ? 'low' : 'high')])}</li>
              ))}
            </ul>
          </div>
        )}
        {mids.length > 0 && (
          <div className="mb-2">
            <div className="text-white/70 mb-1">Workable levers</div>
            <ul className="list-disc pl-4">
              {mids.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.medium)}</li>
              ))}
            </ul>
          </div>
        )}
        {development.length > 0 && (
          <div className="mb-1">
            <div className="text-white/70 mb-1">Development levers</div>
            <ul className="list-disc pl-4">
              {development.map(name=> (
                <li key={name}><b>{name}</b>: {firstSentence((FACET_INTERPRETATIONS as any)[d][name]?.[(isN ? 'high' : 'low')])}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const imageMap: Record<DomainKey, string> = {
    A: '/agree.png',
    C: '/conci.png',
    E: '/extra.png',
    N: '/neur.png',
    O: '/open.png'
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 pb-8">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold" style={{ color: accentColor }}>Summary</h1>
      </div>
      <div className="my-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center max-w-3xl mx-auto">
        <h4 className="font-bold text-lg text-blue-300">Run a Compatibility Report</h4>
        <p className="mt-2 text-white/90 text-sm max-w-xl mx-auto">
          See how you interact with a friend or partner. This report requires a second person's results.
        </p>
        <div className="mt-4">
          <CTAButton
            href="#"
            tier="Paid"
            onClick={(e) => {
              e.preventDefault();
              const extractRid = (input: string): string => {
                const match = input.match(/ridA=([^&]*)/);
                return match ? match[0] : '';
              };

              const partnerRidFinal = extractRid(partnerRid);

              setPreviewModal({
                title: 'Compatibility Report',
                description: 'Unlock a detailed analysis of your interpersonal dynamics with one other person.',
                previewContent: (
                  <div>
                    <h4 className="font-bold text-lg text-blue-300">How You Interact</h4>
                    <p className="mt-2 text-white/90 text-sm">
                      This report reveals the precise points of harmony and friction between you and one other person, creating a playbook for better communication.
                    </p>
                    <p className="text-xs text-white/60 mt-2">
                      For example, we'll show you how {getTopTrait()} might sync or clash with their personality.
                    </p>
                  </div>
                ),
                price: 3.00,
                purchaseUrl: `/compatibility?ridA=${rid}&ridB=${partnerRidFinal}`,
                unlocks: 'The full report includes a detailed breakdown of your domain synergy, conflict patterns, and a playbook for better communication.'
              });
            }}
          >
            Preview Compatibility Report
          </CTAButton>
        </div>
      </div>
      {expandAll && (
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-4">
          {(fullResults || []).filter(result => ['O', 'C', 'E', 'A', 'N'].includes(result.domain)).map(result => (
            <div key={result.domain} className="rounded-xl border" style={{ background: '#0f141a', ...neonBorderStyle() }}>
              <div className="p-6">
                <div className="mb-3 text-xl font-bold flex items-center" style={{ color: accentColor }}>
                  {imageMap[result.domain as DomainKey] ? (
                    <Image src={encodeURI(imageMap[result.domain as DomainKey])} alt="" width={40} height={40} className="w-10 h-10 mr-3 object-cover" quality={95} />
                  ) : (
                    <span className="mr-2" aria-hidden="true">⭐</span>
                  )}
                  {DOMAINS[result.domain].label.split(' (')[0]}
                </div>
                {renderDomainSummary(result.domain, result.payload)}
              </div>
            </div>
          ))}
        </div>
      )}
      {modalDomain && !expandAll && (
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
                  <span className="mr-2" aria-hidden="true">⭐</span>
                )}
                {DOMAINS[modalDomain].label.split(' (')[0]}
              </div>
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                {(()=>{
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

export default function SummaryPage(){
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <SummaryContent />
    </Suspense>
  );
}


