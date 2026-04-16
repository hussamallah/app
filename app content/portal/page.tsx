'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import archetypeRules from "@/arctyps rules.json";

// Archetype taglines mapping
const ARCHETYPE_TAGLINES: Record<string, string> = {
  sovereign: 'Decisive authority establishing order from chaos.',
  rebel: 'Shattering fixed limits to create movement.',
  visionary: 'Sprinting toward horizons unseen by others.',
  navigator: 'Steering through fog via constant adaptation.',
  equalizer: 'Leveling power to ensure absolute fairness.',
  guardian: 'Shielding the vulnerable to preserve safety.',
  seeker: 'Piercing surface illusions to reveal truth.',
  architect: 'Designing enduring frameworks to prevent collapse.',
  spotlight: 'Commanding attention to fuel dynamic action.',
  diplomat: 'Bridging deep divides to secure harmony.',
  partner: 'Forging identity through deep loyal bonds.',
  provider: 'Deriving purpose from fulfilling others\' needs.',
  catalyst: 'Igniting sudden motion to shatter stagnation.',
  vessel: 'Refining every detail to ensure excellence.'
};

// Helper to resolve dynamic colors
function getGlowStyles(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    color: hex,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.5)`,
    glow: `0 0 40px -10px rgba(${r}, ${g}, ${b}, 0.5)`,
    bgGlow: `rgba(${r}, ${g}, ${b}, 0.1)`
  };
}

function PortalContent() {
  const search = useSearchParams();
  const rid = search.get('rid');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runHash, setRunHash] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  
  // State for the user's data
  const [archetype, setArchetype] = useState({
    title: 'LOADING...',
    subtitle: '// INITIALIZING...',
    color: '#fbbf24', // Default Amber
    icon: '/sovereign.png', // Default
    id: ''
  });

  useEffect(() => {
    setMounted(true);
    if (!rid) return;

    (async () => {
      try {
        // Fetch run data
        const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
        const data = await res.json();
        
        // Extract hash from audit data
        const whoObj = data?.who ?? {};
        const hash = whoObj?.audit?.checksum || whoObj?.audit?.runHash || rid || null;
        setRunHash(hash);
        
        // Resolve Archetype Winner
        const results = Array.isArray(data?.results) ? data.results : [];
        let archName = typeof whoObj?.archetype === 'string' ? whoObj.archetype 
                     : whoObj?.archetype?.winner ? whoObj.archetype.winner
                     : results.find((r: any) => r?.domain === 'ARCH')?.payload?.winner;

        if (archName) {
          // Find config in rules to get color
          const match = (archetypeRules as any).archetypes.find((a: any) => 
            String(a.id).toLowerCase() === String(archName).toLowerCase()
          );
          
          const archIdLower = String(archName).toLowerCase();
          const tagline = ARCHETYPE_TAGLINES[archIdLower] || 'Archetype identified.';
          
          setArchetype({
            title: `THE ${archName.toUpperCase()}`,
            subtitle: tagline,
            color: match?.color?.hex || '#fbbf24',
            icon: `/${archIdLower}.png`,
            id: archName
          });
        }
      } catch (e) {
        console.error("Failed to load portal data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  if (!mounted) return null;

  const styles = getGlowStyles(archetype.color);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative selection:bg-white/20">
      
      {/* --- AMBIENT NOISE & GRID --- */}
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
        <div>ID: <span className="text-white">{rid || 'NO-RUN-ID'}</span></div>
        <div className="hidden md:block">HASH: <span className="text-white">{runHash || 'VERIFYING...'}</span></div>
        <div>STATUS: <span className="text-green-500 animate-pulse">LIVE</span></div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-20">
        
        {/* --- STAGE 1: THE ARCHETYPE REVEAL --- */}
        <div className="text-center mb-4 md:mb-24 relative group cursor-default">
          {/* Dynamic Glow */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full blur-[120px] opacity-80 transition-opacity duration-1000"
            style={{ backgroundColor: styles.bgGlow }}
          ></div>
          
          <div className="relative z-10 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out flex flex-col items-center">
            {/* Image Icon */}
            <div className="w-32 h-32 md:w-48 md:h-48 mb-6 grayscale-0 transition-all duration-500 relative">
               <Image 
                 src={archetype.icon} 
                 alt={archetype.title} 
                 fill 
                 className="object-contain"
                 onError={(e) => { e.currentTarget.style.display='none'; }}
               />
            </div>
            
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              {archetype.title}
            </h1>
            <p className="font-mono text-xs md:text-sm tracking-[0.2em] opacity-80" style={{ color: archetype.color }}>
              {archetype.subtitle}
            </p>
          </div>
        </div>

        {/* --- STAGE 2: THE TRI-PATH INTERFACE --- */}
        <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">

          <PathCard 
            href={`/who?rid=${rid}`}
            number="01"
            title="THE MIRROR"
            subtitle="PSYCHOLOGY & NARRATIVE"
            desc="Read your story. Understand your strengths, your shadow, and the 'why' behind your actions."
            accentColor={archetype.color} // Dynamic accent
            isExpanded={expandedCard === "01"}
            onExpand={() => setExpandedCard(expandedCard === "01" ? null : "01")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          />

          <PathCard 
            href={`/results?rid=${rid}`}
            number="02"
            title="SYSTEM OVERVIEW"
            subtitle="OPERATIONAL PARAMETERS"
            desc="Select a core to analyze. Explore your five domains, facet scores, and the operational parameters that drive your behavior."
            accentColor="#3b82f6" // Keep Blue for data
            isExpanded={expandedCard === "02"}
            onExpand={() => setExpandedCard(expandedCard === "02" ? null : "02")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          />

          <PathCard 
            href={`/conflict-patterns?rid=${rid}`}
            number="03"
            title="THE WAR ROOM"
            subtitle="CONFLICT & STRATEGY"
            desc="Where the friction lives. Identify your internal conflicts and receive your operational orders."
            accentColor="#ef4444" // Red for conflict
            isExpanded={expandedCard === "03"}
            onExpand={() => setExpandedCard(expandedCard === "03" ? null : "03")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          />

          <PathCard 
            href={`/results/operation-of-life-report?rid=${rid}`}
            number="04"
            title="OPERATION MANUAL"
            subtitle="TACTICS & EXECUTION"
            desc="Your personalized playbook. Actionable advice for your career, decisions, routines, and daily operations."
            accentColor="#10b981" // Green for growth/action
            isExpanded={expandedCard === "04"}
            onExpand={() => setExpandedCard(expandedCard === "04" ? null : "04")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            )}
          />

          <PathCard 
            href={`/existential-circuits?rid=${rid}`}
            number="05"
            title="EXISTENTIAL CIRCUITS"
            subtitle="ENERGY & FLOW"
            desc="Map your five core circuits. Understand how Energy, Clarity, Structure, Bond, and Drive shape your behavior."
            accentColor="#a855f7" // Purple for circuits/energy
            isExpanded={expandedCard === "05"}
            onExpand={() => setExpandedCard(expandedCard === "05" ? null : "05")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          />

          <PathCard 
            href={`/compatibility?ridA=${rid}`}
            number="06"
            title="COMPATIBILITY REPORT"
            subtitle="RELATIONSHIPS & SYNERGY"
            desc="Analyze interpersonal dynamics. Discover points of harmony and friction between you and another person."
            accentColor="#f59e0b" // Amber/orange for relationships
            isExpanded={expandedCard === "06"}
            onExpand={() => setExpandedCard(expandedCard === "06" ? null : "06")}
            icon={(
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )}
          />

        </div>
      </main>
    </div>
  );
}

// --- SUB-COMPONENT ---
function PathCard({ href, number, title, subtitle, desc, accentColor, icon, isExpanded, onExpand }: any) {
  // We use inline styles for the hover colors to support dynamic user colors
  const [hover, setHover] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      e.preventDefault();
      if (isExpanded) {
        // Second tap: navigate
        window.location.href = href;
      } else {
        // First tap: expand (this will collapse any other expanded card)
        onExpand();
      }
    }
    // On desktop, let the Link handle navigation normally
  };

  const isActive = hover || isExpanded;

  return (
    <Link 
      href={href} 
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="group relative flex flex-col justify-end h-[200px] md:h-[320px] p-6 md:p-8 bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.07] backdrop-blur-sm"
      style={{
        borderColor: isActive ? `${accentColor}80` : 'rgba(255,255,255,0.1)', // 80 = 50% opacity
        boxShadow: isActive ? `0 0 40px -10px ${accentColor}40` : 'none',
        transform: isActive ? 'translateY(-8px)' : 'none'
      }}
    >
      {/* Background Icon (Faded) */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-700 scale-150 grayscale transition-all"
        style={{ 
          color: accentColor,
          opacity: isActive ? 0.1 : 0,
          filter: isActive ? 'grayscale(0)' : 'grayscale(1)'
        }}
      >
        <div className="scale-[3] opacity-10">{icon}</div>
      </div>

      {/* Top Metadata */}
      <div 
        className={`absolute top-6 left-6 font-mono text-[10px] tracking-widest transition-all duration-300 ${
          isExpanded ? 'opacity-0 pointer-events-none' : ''
        }`}
        style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.3)' }}>
        {number} //
      </div>

      {/* Content */}
      <div className="relative z-10 transition-transform duration-500 ease-out"
           style={{ transform: isActive ? 'translateY(0)' : 'translateY(16px)' }}>
        <div 
          className="mb-2 md:mb-4 origin-left transition-all duration-500"
          style={{ 
            color: isActive ? accentColor : 'white',
            opacity: isActive ? 1 : 0.5,
            transform: isActive ? 'scale(1.1)' : 'scale(1)'
          }}
        >
          {icon}
        </div>
        <h2 className="text-lg md:text-2xl font-bold tracking-tight text-white mb-1">
          {title}
        </h2>
        <p 
          className="text-[10px] md:text-xs font-mono uppercase tracking-wider mb-2 md:mb-4 transition-colors"
          style={{ color: isActive ? accentColor : 'rgba(255,255,255,0.4)' }}
        >
          {subtitle}
        </p>
        
        <div className="grid transition-[grid-template-rows] duration-500 ease-out"
             style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}>
          <p className="text-[10px] md:text-sm text-gray-400 overflow-hidden leading-relaxed pr-4 border-l border-white/20 pl-3">
            {desc}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PortalContent />
    </Suspense>
  );
}
