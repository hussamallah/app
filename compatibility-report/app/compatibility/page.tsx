'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const domainSynergyCopy: Record<string, Record<string, string>> = {
    O: {
        'high-high': "Both partners are highly open to new experiences, leading to a life rich with shared exploration, creativity, and intellectual curiosity. They are likely to enjoy trying new things together and appreciate each other's imagination. Potential friction can arise if neither partner provides a grounding force, leading to a lack of stability.",
        Complement: "You’re both curious, imaginative, and adventurous. One is just slightly more intense, which keeps ideas flowing without chaos.",
        Tension: "One of you thrives on new ideas and experiences, while the other prefers the familiar. This can lead to friction over plans and routines."
    },
    C: {
        Align: "You have a similar approach to organization and discipline, making it easy to coordinate on tasks and long-term goals.",
        Complement: "Both of you care about duty and order, though one takes it to max. This keeps discipline strong but avoids rigidity.",
        Tension: "One of you is highly structured and plan-oriented, while the other is more spontaneous and flexible. This can cause conflict over deadlines and methods."
    },
    E: {
        Align: "Your energy levels in social situations are well-matched, whether you both enjoy being the life of the party or prefer quieter settings.",
        Complement: "Energy levels are close. One is more assertive and active, the other steadier, which helps set a sustainable pace.",
        Tension: "One person is energized by social interaction while the other is drained by it. This requires careful energy management to avoid burnout or loneliness."
    },
    A: {
        Align: "You share a common approach to cooperation and empathy, fostering a relationship built on mutual trust and understanding.",
        Complement: "Shared trust and cooperation. A small modesty gap means one may step forward more often—good if named, risky if hidden.",
        Tension: "One person prioritizes harmony and accommodation, while the other values directness and skepticism. This can lead to misunderstandings and hurt feelings."
    },
    N: {
        Align: "Both feel stress in similar ways. This creates deep understanding but also a risk of amplifying worry unless buffered.",
        Complement: "One of you is more emotionally reactive than the other, creating a dynamic where one can be a stabilizing force, but must be careful not to dismiss the other's feelings.",
        Tension: "You have very different emotional responses to stress. One's sensitivity may seem excessive to the other, while the other's stability may come across as coldness.",
        Watch: "While your emotional reactivity differs, it's in a range that requires attention. One can buffer the other, but it's important to have clear communication during stressful times."
    }
};

const domainLabels: Record<string, string> = {
    O: 'Openness',
    C: 'Conscientiousness',
    E: 'Extraversion',
    A: 'Agreeableness',
    N: 'Neuroticism',
}

function CompatibilityContent() {
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
          const res = await fetch(`/api/compatibility?ridA=${encodeURIComponent(ridAFromUrl)}&ridB=${encodeURIComponent(ridBFromUrl)}`);
          if (!res.ok) {
            const errorData = await res.json().catch(() => ({ message: 'Failed to fetch compatibility data' }));
            throw new Error(errorData.message || 'Failed to fetch compatibility data');
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
    // Tries to find a rid=... parameter in a URL-like string
    const urlPattern = /[?&]rid=([a-zA-Z0-9_-]{24,})/;
    const urlMatch = input.match(urlPattern);
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1];
    }
    // Falls back to finding the first 24+ character alphanumeric string
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
    if (extractedA && extractedB) {
      window.location.href = `/compatibility?ridA=${extractedA}&ridB=${extractedB}`;
    }
  };

  const generateInviteLink = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
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
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Loading Report...</div>;
  }
  
  if (error) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Error: {error}</div>;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-gray-900 text-white p-8 font-sans">
        {/* Back Button */}
        {ridA && (
          <Link 
            href={`/portal?rid=${ridA}`}
            className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-black/80 border border-white/30 rounded-lg text-white hover:text-white hover:bg-black hover:border-white/50 transition-all font-mono text-base uppercase tracking-wider backdrop-blur-sm shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-semibold">BACK</span>
          </Link>
        )}
        
        <div className="max-w-md mx-auto">
            <h1 className="text-3xl font-bold mb-4 text-center">Compatibility Report</h1>
            <p className="text-gray-400 text-center mb-6">Enter the IDs or page URLs for two people to generate their report.</p>
            <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="mb-4">
                    <label htmlFor="ridA" className="block mb-2 text-sm font-bold text-gray-300">Person A's Result Code or URL (You)</label>
                    <input 
                      type="text" 
                      id="ridA" 
                      name="ridA"
                      value={ridA}
                      onChange={e => { setRidA(e.target.value); setError(null); }}
                      onBlur={e => setRidA(extractRid(e.target.value))}
                      placeholder="Paste code or URL for Person A"
                      className="bg-gray-700 border border-gray-600 rounded w-full p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly={!!ridAFromUrl}
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="ridB" className="block mb-2 text-sm font-bold text-gray-300">Person B's Result Code or URL</label>
                    <input 
                      type="text" 
                      id="ridB" 
                      name="ridB" 
                      value={ridB}
                      onChange={e => { setRidB(e.target.value); setError(null); }}
                      onBlur={e => setRidB(extractRid(e.target.value))}
                      placeholder="Paste code or URL for Person B"
                      className="bg-gray-700 border border-gray-600 rounded w-full p-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                {ridA && (
                  <div className="mb-4 p-3 bg-gray-700/50 border border-gray-600 rounded">
                    <p className="text-sm text-gray-300 mb-2">Share this link with Person B:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generateInviteLink()}
                        className="flex-1 bg-gray-800 border border-gray-600 rounded p-2 text-white text-xs focus:outline-none"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        type="button"
                        onClick={copyInviteLink}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded text-sm transition-colors duration-300 whitespace-nowrap"
                      >
                        {inviteLinkCopied ? 'Copied!' : 'Copy Link'}
                      </button>
                    </div>
                  </div>
                )}
                {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300">
                    Compare
                </button>
            </form>
        </div>
      </main>
    )
  }

  const alignmentHighlights = data.compat.facets.align_pairs.slice(0, 4).map((p: any) => p.facet.split(':')[1]).join(', ');
  const topConflict = data.compat.facets.conflict_pairs[0];
  const topOverride = data.prescriptions.overrides[0];

  return (
    <main className="min-h-screen bg-gray-900 text-white p-8 font-sans leading-relaxed">
        {/* Back Button */}
        {ridA && (
          <Link 
            href={`/portal?rid=${ridA}`}
            className="fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 bg-black/80 border border-white/30 rounded-lg text-white hover:text-white hover:bg-black hover:border-white/50 transition-all font-mono text-base uppercase tracking-wider backdrop-blur-sm shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-semibold">BACK</span>
          </Link>
        )}
        
        <div className="max-w-3xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Ground Zero Compatibility Report</h1>
                <div className="text-lg text-gray-400">
                    {data.ui.badges.map((b: string) => <span key={b}>{b}</span>).reduce((prev: any, curr: any) => [prev, ' · ', curr])}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                    Compare Hash: <code className="bg-gray-800 p-1 rounded">{data.compare_hash}</code>
          </div>
            </header>

            <section className="text-center mb-10">
                <h2 className="text-2xl text-gray-300">
                    Overall Compatibility: <span className="font-bold text-3xl text-white">{data.compat.overall.score_pct}% · {data.compat.overall.band}</span>
                </h2>
                <p className="mt-2 text-gray-400 max-w-2xl mx-auto">{data.compat.overall.rationale.join(', ')}.</p>
            </section>
            
            <hr className="border-gray-700 my-10" />

            <section className="mb-10">
                <h3 className="text-3xl font-bold text-center mb-6">Domain Synergy</h3>
                <div className="space-y-6">
                    {Object.entries(data.compat.domains).map(([key, value]: [string, any]) => (
                        <div key={key}>
                            <h4 className="text-xl font-bold">
                                {domainLabels[key]} ({key}): <span className="text-gray-300">{Math.round(value.score_pct)}% – {value.synergy}</span>
                            </h4>
                            <p className="text-gray-400 mt-1">
                                {domainSynergyCopy[key]?.[value.synergy] || "A notable dynamic in this area."}
                            </p>
                  </div>
                ))}
              </div>
            </section>

            <hr className="border-gray-700 my-10" />

            <section className="mb-10">
                <h3 className="text-3xl font-bold text-center mb-6">Key Dynamics</h3>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <h4 className="text-xl font-bold">Alignment Highlights</h4>
                    <p className="text-gray-400 mt-1">Shared curiosity ({alignmentHighlights}).</p>

                    <div className="my-4 border-t border-gray-700"></div>

                    <h4 className="text-xl font-bold">Conflict Zone</h4>
                    {topConflict ? (
                        <div>
                            <p className="mt-1"><span className="font-bold text-red-400">{topConflict.facet.split(':')[1]}:</span> One is more humble, the other more forward.</p>
                            <ul className="list-disc list-inside text-gray-400 mt-2 space-y-1">
                                <li><span className="font-semibold">Friction:</span> may look like arrogance vs self-doubt.</li>
                                <li><span className="font-semibold">Guardrail:</span> <strong className="text-yellow-400">{topOverride.id}</strong>—{topOverride.why}</li>
                            </ul>
                        </div>
                    ) : <p className="text-gray-400 mt-1">No significant conflict pairs identified.</p>}
                </div>
            </section>
            
            <hr className="border-gray-700 my-10" />

            <section className="mb-10">
                <h3 className="text-3xl font-bold text-center mb-6">Playbooks You Two Can Use</h3>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <p className="text-gray-400 mb-4">Based on your unique dynamic, here are specific strategies to enhance synergy and mitigate friction.</p>
                    {data.prescriptions.overrides.length > 0 || data.prescriptions.routines.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            {data.prescriptions.overrides.map((p: any) => <li key={p.id}><strong className="text-yellow-400">{p.id}:</strong> {p.why}</li>)}
                            {data.prescriptions.routines.map((r: any) => <li key={r.name}><strong className="text-yellow-400">{r.name}:</strong> {r.spec}</li>)}
                        </ul>
                    ) : (
                        <p className="text-gray-400">Your profiles suggest a natural alignment that doesn't require specific playbooks. Continue with open communication.</p>
                    )}
                </div>
            </section>

            <hr className="border-gray-700 my-10" />

            <section className="mb-10">
                <h3 className="text-3xl font-bold text-center mb-6">Scenarios</h3>
                <div className="bg-gray-800 p-6 rounded-lg">
                    <p className="text-gray-400 mb-4">Consider these common situations and guardrails to proactively manage potential challenges.</p>
                    {data.prescriptions.scenarios.work.length > 0 || data.prescriptions.scenarios.relationship.length > 0 ? (
                        <ul className="list-disc list-inside text-gray-300 space-y-2">
                            {data.prescriptions.scenarios.work.map((s: string, i: number) => <li key={`w-${i}`}><strong className="text-yellow-400">Work:</strong> {s}</li>)}
                            {data.prescriptions.scenarios.relationship.map((s: string, i: number) => <li key={`r-${i}`}><strong className="text-yellow-400">Relationship:</strong> {s}</li>)}
                </ul>
                    ) : (
                        <p className="text-gray-400">No specific high-risk scenarios were flagged based on your compatibility profile.</p>
                    )}
            </div>
            </section>

        </div>
    </main>
  );
}

export default function CompatibilityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center font-sans">Loading...</div>}>
      <CompatibilityContent />
    </Suspense>
  );
}


