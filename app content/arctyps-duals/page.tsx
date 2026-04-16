'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const sampleData = {
  narrative: {
    title: "Sovereign vs. Rebel",
    summary: "A fundamental clash between chaos and order. The Rebel exists to break the rules that the Sovereign writes. This pairing can lead to explosive growth or complete gridlock."
  },
  a: {
    title: "The Sovereign",
    superpower: "Clarity and Structure",
    operation: "Builds and enforces systems to ensure stability and control.",
    kryptonite: "Unpredictability and defiance.",
    drive: "Order"
  },
  b: {
    title: "The Rebel",
    superpower: "Disruption and Change",
    operation: "Challenges existing structures to create space for new ideas.",
    kryptonite: "Rigid rules and unquestioned authority.",
    drive: "Freedom"
  },
  interaction: {
    sync: {
      title: "Where You Sync: Radical Transformation",
      narrative: "When the Sovereign's system becomes truly outdated, the Rebel is the perfect tool to shatter it. The Sovereign can then build a new, better system from the pieces. This is a pairing for radical transformation."
    },
    clash: {
      title: "Where You Clash: Control vs. Chaos",
      narrative: "This is the core conflict. The Sovereign leads by creating rules; the Rebel feels alive only when breaking them. The Sovereign will see the Rebel as a threat to stability; the Rebel will see the Sovereign as an oppressive force.",
      playbook: {
        a: "Your job is to channel the Rebel's disruptive energy toward the right target. Give them a wall to break, but make sure it's the right wall.",
        b: "Your job is to aim your fire. The Sovereign isn't your enemy; their outdated system is. Help them see the difference."
      }
    }
  }
};


function ArchetypeDualsContent() {
  const search = useSearchParams();
  const ridAFromUrl = search?.get('ridA') || '';
  const ridBFromUrl = search?.get('ridB') || '';
  const currentUserRid = search?.get('rid') || '';
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);

  const [ridA, setRidA] = useState(ridAFromUrl || currentUserRid);
  const [ridB, setRidB] = useState(ridBFromUrl);

  useEffect(() => {
    if (!ridAFromUrl && currentUserRid) {
      setRidA(currentUserRid);
    }
  }, [currentUserRid, ridAFromUrl]);

  useEffect(() => {
    if (ridAFromUrl && ridBFromUrl) {
      async function fetchData() {
    setLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/archetype-duals?ridA=${encodeURIComponent(ridAFromUrl)}&ridB=${encodeURIComponent(ridBFromUrl)}`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch archetype data' }));
            throw new Error(errorData.message || 'Failed to fetch archetype data');
          }
          const jsonData = await res.json();
          setData(jsonData);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
      fetchData();
    } else {
      setLoading(false);
    }
  }, [ridAFromUrl, ridBFromUrl]);

  const extractRid = (input: string): string => {
    if (!input) return input;
    const urlPattern = /[?&]rid=([a-zA-Z0-9_-]{24,})/;
    const urlMatch = input.match(urlPattern);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    const directPattern = /([a-zA-Z0-9_-]{24,})/;
    const directMatch = input.match(directPattern);
    if (directMatch && directMatch[0]) {
      return directMatch[0];
    }
    return input;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const extractedA = extractRid(ridA);
    const extractedB = extractRid(ridB);
    if (extractedA === extractedB) {
      setError("The two IDs cannot be the same. Please enter two different IDs.");
      return;
    }
    if (extractedA && extractedB) {
      window.location.href = `/arctyps-duals?ridA=${extractedA}&ridB=${extractedB}`;
    }
  };

  const showSample = () => {
    setData(sampleData);
    setError(null);
    setLoading(false);
  };

  const generateInviteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    if (ridA) {
      return `${baseUrl}/?ridA=${encodeURIComponent(ridA)}`;
    }
    return `${baseUrl}/`;
  };

  const copyInviteLink = async () => {
    const link = generateInviteLink();
    if (link && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(link);
        setInviteLinkCopied(true);
        setTimeout(() => setInviteLinkCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Loading Archetype Comparison...</div>;
  }
  
  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
        <div className="max-w-md mx-auto text-center">
            <h1 className="text-3xl font-bold mb-4" style={{ color: '#E4B847' }}>Archetype Duals</h1>
            <p className="text-white/80 mb-6">Enter two result codes to see how their archetypes interact.</p>
            <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 p-6 rounded-lg shadow-lg">
                <div className="mb-4">
                    <label htmlFor="ridA" className="block mb-2 text-sm font-bold text-white/80">Person A's Result Code or URL (You)</label>
                    <input 
                      type="text" 
                      id="ridA" 
                      name="ridA" 
                      value={ridA}
                      onChange={e => { setRidA(e.target.value); setError(null); }}
                      onBlur={e => setRidA(extractRid(e.target.value))}
                      placeholder="Paste code or URL for Person A"
                      className="bg-black/50 border border-white/20 rounded w-full p-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                      readOnly={!!ridAFromUrl}
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="ridB" className="block mb-2 text-sm font-bold text-white/80">Person B's Result Code or URL</label>
                    <input 
                      type="text" 
                      id="ridB" 
                      name="ridB"
                      value={ridB}
                      onChange={e => { setRidB(e.target.value); setError(null); }}
                      onBlur={e => setRidB(extractRid(e.target.value))}
                      placeholder="Paste code or URL for Person B"
                      className="bg-black/50 border border-white/20 rounded w-full p-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500" />
                </div>
                {ridA && (
                  <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded">
                    <p className="text-sm text-white/70 mb-2">Share this link with Person B:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generateInviteLink()}
                        className="flex-1 bg-black/50 border border-white/20 rounded p-2 text-white text-xs focus:outline-none"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={copyInviteLink}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold px-4 py-2 rounded text-sm transition-colors duration-300 whitespace-nowrap"
                      >
                        {inviteLinkCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded transition-colors duration-300">
                    Compare Archetypes
                </button>
            </form>
            <div className="mt-6">
              <button onClick={showSample} className="text-yellow-400 hover:underline">
                Show me a sample comparison
              </button>
            </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans leading-relaxed">
        <div className="max-w-4xl mx-auto">
            {/* Act 1: The Hook */}
            <header className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-bold mb-2" style={{ color: '#E4B847' }}>{data.narrative.title}</h1>
                <p className="text-lg md:text-xl text-white/70 max-w-3xl mx-auto">{data.narrative.summary}</p>
            </header>

            {/* Act 2: The Cheat Sheet */}
            <section className="mb-12">
              <div className="grid md:grid-cols-2 gap-px bg-white/10 rounded-lg overflow-hidden border border-white/10">
                {/* Person A */}
                <div className="bg-black/30 p-6">
                    <h2 className="text-2xl font-bold" style={{ color: '#FFD36E' }}>{data.a.title}</h2>
                    <dl className="mt-4 space-y-4 text-sm">
                      <div>
                        <dt className="font-semibold text-white/60">Your Superpower:</dt>
                        <dd className="mt-1 text-white/90">{data.a.superpower}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-white/60">How You Operate:</dt>
                        <dd className="mt-1 text-white/90">{data.a.operation}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-white/60">Your Kryptonite:</dt>
                        <dd className="mt-1 text-white/90">{data.a.kryptonite}</dd>
                      </div>
                       <div>
                        <dt className="font-semibold text-white/60">Core Drive:</dt>
                        <dd className="mt-1 font-mono text-lg text-yellow-300">{data.a.drive}</dd>
                      </div>
                    </dl>
                </div>

                {/* Person B */}
                <div className="bg-black/30 p-6">
                    <h2 className="text-2xl font-bold" style={{ color: '#FFD36E' }}>{data.b.title}</h2>
                    <dl className="mt-4 space-y-4 text-sm">
                       <div>
                        <dt className="font-semibold text-white/60">Their Superpower:</dt>
                        <dd className="mt-1 text-white/90">{data.b.superpower}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-white/60">How They Operate:</dt>
                        <dd className="mt-1 text-white/90">{data.b.operation}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-white/60">Their Kryptonite:</dt>
                        <dd className="mt-1 text-white/90">{data.b.kryptonite}</dd>
                      </div>
                       <div>
                        <dt className="font-semibold text-white/60">Core Drive:</dt>
                        <dd className="mt-1 font-mono text-lg text-yellow-300">{data.b.drive}</dd>
                      </div>
                    </dl>
                </div>
              </div>
            </section>

            {/* Act 3: The Playbook */}
            <section>
                <h3 className="text-3xl font-bold text-center mb-6">The Deep Dive & Playbook</h3>
                <div className="space-y-6">
                    {/* Where You Sync */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                        <h4 className="text-xl font-bold text-green-400">{data.interaction.sync.title}</h4>
                        <p className="mt-2 text-white/80">{data.interaction.sync.narrative}</p>
                    </div>
                     {/* Where You Clash */}
                     <div className="bg-white/5 border border-white/10 p-6 rounded-lg">
                        <h4 className="text-xl font-bold text-red-400">{data.interaction.clash.title}</h4>
                        <p className="mt-2 text-white/80">{data.interaction.clash.narrative}</p>
                        {data.interaction.clash.playbook && (
                          <div className="mt-4 pt-4 border-t border-white/20">
                            <h5 className="font-semibold text-yellow-400">The Playbook:</h5>
                            <p className="text-sm text-white/80 mt-2">
                              <strong className="block text-white/90">Your Job ({data.a.title}):</strong>
                              {data.interaction.clash.playbook.a}
                            </p>
                            <p className="text-sm text-white/80 mt-2">
                              <strong className="block text-white/90">Their Job ({data.b.title}):</strong>
                              {data.interaction.clash.playbook.b}
                            </p>
                          </div>
                        )}
                    </div>
                </div>
            </section>

        </div>
    </main>
  );
}

export default function ArchetypeDualsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Loading...</div>}>
      <ArchetypeDualsContent />
    </Suspense>
  );
}


