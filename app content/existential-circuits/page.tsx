'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ExistentialCircuits from '@/components/who/ExistentialCircuits';
import AllLifeSignals from '@/components/who/AllLifeSignals';
import Tooltip from '@/components/Tooltip';

function CircuitsContent(){
  const search = useSearchParams();
  const rid = search?.get('rid') || '';
  const [domainMeans, setDomainMeans] = useState<any>(null);
  const [fullResults, setFullResults] = useState<any>(null);
  const [accentColor] = useState('#d4af37');

  useEffect(()=>{
    (async ()=>{
      try{
        if (!rid) return;
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();
        setDomainMeans(data?.who?.derived?.domainMeans || null);
        setFullResults(Array.isArray(data?.results) ? data.results : null);
      } catch {}
    })();
  },[rid]);

  if (!rid) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Missing rid</div>;
  if (!domainMeans && !fullResults) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;

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
      
      <div className="gz-theme container" style={{
        ['--bg-color' as any]: '#121212',
        ['--surface-color' as any]: '#1e1e1e',
        ['--primary-text-color' as any]: '#e0e0e0',
        ['--secondary-text-color' as any]: '#a0a0a0',
        ['--accent-color' as any]: accentColor || '#4cafef',
        ['--border-color' as any]: '#333',
        ['--progress-green' as any]: '#2ecc71',
        ['--progress-yellow' as any]: '#f1c40f',
        ['--progress-red' as any]: '#e74c3c',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0'
        }}>
         <div className="text-center">
           <h1 className="text-2xl font-bold mb-4" style={{ color: '#d4af37' }}>
             <Tooltip text="These are the core processes you use to interact with the world, such as how you manage energy, seek clarity, or build structure.">
               Existential Circuits
             </Tooltip>
           </h1>
         </div>
          <ExistentialCircuits domainMeans={domainMeans} fullResults={fullResults} />
          <AllLifeSignals domainMeans={domainMeans} />
        </div>
      </div>
    </main>
  );
}

export default function ExistentialCircuitsPage(){
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>}>
      <CircuitsContent />
    </Suspense>
  );
}


