'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// MOCK DATA (Simulating the props passed after assessment)
const ARCHETYPE = {
  title: 'THE SOVEREIGN',
  subtitle: '// THE ARCHITECT OF ORDER',
  color: 'text-amber-500',
  borderColor: 'border-amber-500/50',
  glow: 'shadow-amber-500/20',
  icon: '🦅' // Replace with your actual image path
};

export default function PortalDemo() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-amber-500/30 overflow-hidden relative">
      
      {/* --- AMBIENT NOISE & GRID (The "Deterministic" Atmosphere) --- */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" 
           style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}>
      </div>
      <div className="fixed inset-0 pointer-events-none z-0"
           style={{ 
             backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)',
             backgroundSize: '40px 40px',
             maskImage: 'radial-gradient(circle at center, black 40%, transparent 100%)'
           }}>
      </div>

      {/* --- HEADER: TECH SPECS --- */}
      <header className="fixed top-0 w-full p-6 flex justify-between items-center z-50 text-[10px] tracking-[0.2em] font-mono text-white/30 uppercase mix-blend-difference">
        <div>ID: <span className="text-white">GZ-RUN-9921</span></div>
        <div className="hidden md:block">HASH: VERIFIED_SHA256</div>
        <div>STATUS: <span className="text-green-500 animate-pulse">LIVE</span></div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        
        {/* --- STAGE 1: THE ARCHETYPE REVEAL --- */}
        <div className="text-center mb-24 relative group cursor-default">
          {/* The "God Ray" Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[120px] opacity-50 group-hover:opacity-80 transition-opacity duration-1000"></div>
          
          <div className="relative z-10 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out">
            <div className="text-6xl md:text-8xl mb-4 grayscale group-hover:grayscale-0 transition-all duration-500">
              {ARCHETYPE.icon}
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              {ARCHETYPE.title}
            </h1>
            <p className={`font-mono ${ARCHETYPE.color} text-xs md:text-sm tracking-[0.4em] uppercase opacity-80`}>
              {ARCHETYPE.subtitle}
            </p>
          </div>
        </div>

        {/* --- STAGE 2: THE TRI-PATH INTERFACE --- */}
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* CARD 1: THE MIRROR */}
          <PathCard 
            href="/who"
            number="01"
            title="THE MIRROR"
            subtitle="PSYCHOLOGY & NARRATIVE"
            desc="Read your story. Understand your strengths, your shadow, and the 'why' behind your actions."
            accent="group-hover:border-purple-500/50 group-hover:shadow-purple-500/20"
            textAccent="group-hover:text-purple-400"
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          />

          {/* CARD 2: THE BLUEPRINT */}
          <PathCard 
            href="/results"
            number="02"
            title="THE BLUEPRINT"
            subtitle="DATA & DETERMINISM"
            desc="Inspect the machine. View your 30 Facet scores, Domain breakdown, and the raw math."
            accent="group-hover:border-blue-500/50 group-hover:shadow-blue-500/20"
            textAccent="group-hover:text-blue-400"
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          />

          {/* CARD 3: THE WAR ROOM */}
          <PathCard 
            href="/conflict-patterns"
            number="03"
            title="THE WAR ROOM"
            subtitle="CONFLICT & STRATEGY"
            desc="Where the friction lives. Identify your internal conflicts and receive your operational orders."
            accent="group-hover:border-amber-500/50 group-hover:shadow-amber-500/20"
            textAccent="group-hover:text-amber-400"
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          />

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="fixed bottom-6 left-0 w-full text-center pointer-events-none z-50">
        <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
          Ground Zero // Identity Engine v1.0
        </p>
      </footer>
    </div>
  );
}

// --- SUB-COMPONENT FOR THE CARDS ---
function PathCard({ href, number, title, subtitle, desc, accent, textAccent, icon }: any) {
  return (
    <Link href={href} className={`
      group relative flex flex-col justify-end h-[320px] p-8 
      bg-white/5 border border-white/10 rounded-xl overflow-hidden
      transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.07] backdrop-blur-sm
      ${accent} hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)]
    `}>
      {/* Background Icon (Faded) */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-10 transition-opacity duration-700 scale-150 grayscale group-hover:grayscale-0 ${textAccent}`}>
        {/* Cloning icon with larger size */}
        <div className="scale-[3] opacity-10">{icon}</div>
      </div>

      {/* Top Metadata */}
      <div className="absolute top-6 left-6 font-mono text-[10px] tracking-widest text-white/30 group-hover:text-white transition-colors">
        {number} //
      </div>

      {/* Content */}
      <div className="relative z-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ease-out">
        <div className={`mb-4 opacity-50 group-hover:opacity-100 group-hover:scale-110 origin-left transition-all duration-500 ${textAccent}`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-1">
          {title}
        </h2>
        <p className={`text-xs font-mono uppercase tracking-wider mb-4 text-white/40 ${textAccent} transition-colors`}>
          {subtitle}
        </p>
        
        {/* Description Reveal */}
        <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out">
          <p className="text-sm text-gray-400 overflow-hidden leading-relaxed pr-4 border-l border-white/20 pl-3">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}
