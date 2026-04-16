"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DomainKey } from "@/lib/bigfive/constants";
import operationManualContent from "@/operation-manual-empty.json";

const DOMAIN_MAP: Record<DomainKey, string> = {
  O: 'Openness',
  C: 'Conscientiousness',
  E: 'Extraversion',
  A: 'Agreeableness',
  N: 'Neuroticism',
};

interface DynamicReport {
  title: string;
  sections: Array<{
    title: string;
    body: string[];
  }>;
}

// Helper function to evaluate JSON conditions
function evaluateCondition(condition: string, flags: Record<string, boolean>): boolean {
  if (!condition || condition === "true") return true;
  try {
    // Replace flag names with their boolean values
    const evalString = condition.replace(/(\w+)/g, (match) => {
      return flags[match] ? 'true' : 'false';
    });
    // Use Function constructor instead of eval for better security
    return new Function('return ' + evalString)();
  } catch (e) {
    return false;
  }
}

function generateReportFromJSON(results: any[]): DynamicReport {
  // Extract personality scores
  const scores: Record<string, { domain: number; facets: Record<string, number> }> = {};
  
  for (const result of results) {
    const domainKey = result.domain as DomainKey;
    if (!domainKey || !DOMAIN_MAP[domainKey]) continue;
    
    const payload = result.payload || {};
    const final = payload.final || {};
    
    scores[domainKey] = {
      domain: final.domain_mean_raw || 3,
      facets: {}
    };
    
    const facetScores = final.A_raw || payload.phase2?.A_raw || {};
    for (const [facetKey, rawScore] of Object.entries(facetScores)) {
      if (typeof rawScore === 'number') {
        scores[domainKey].facets[facetKey] = rawScore;
      }
    }
  }

  // Calculate flags based on JSON thresholds
  // Extract cutoffs from bucket6 anchors
  const anchors = operationManualContent.schema.bucket6.anchors;
  const highLowAnchor = anchors.find((a: any) => a.label === 'high low');
  const highScoreLowAnchor = anchors.find((a: any) => a.label === 'high score low');
  const low_max = highLowAnchor?.score || 2.0;
  const high_min = highScoreLowAnchor?.score || 4.0;
  const flags: Record<string, boolean> = {};

  // Calculate domain flags
  for (const [domainKey, domainName] of Object.entries(DOMAIN_MAP)) {
    const domainScore = scores[domainKey]?.domain || 3;
    flags[`High${domainKey}`] = domainScore >= high_min;
    flags[`Med${domainKey}`] = domainScore > low_max && domainScore < high_min;
    flags[`Low${domainKey}`] = domainScore <= low_max;
  }

  // Calculate facet flags (simplified - just the key ones)
  const getFacetScore = (facetName: string): number => {
    for (const domain of Object.values(scores)) {
      if (domain.facets[facetName.toLowerCase()]) {
        return domain.facets[facetName.toLowerCase()];
      }
    }
    return 3;
  };

  flags['HighAssert'] = getFacetScore('assertiveness') >= high_min;
  flags['LowAssert'] = getFacetScore('assertiveness') <= low_max;
  flags['HighOrder'] = getFacetScore('orderliness') >= high_min;
  flags['LowOrder'] = getFacetScore('orderliness') <= low_max;
  flags['LowCoop'] = getFacetScore('cooperation') <= low_max;
  flags['LowSymp'] = getFacetScore('sympathy') <= low_max;
  flags['HighAchieve'] = getFacetScore('achievement_striving') >= high_min;
  flags['LowImagin'] = getFacetScore('imagination') <= low_max;
  flags['HighArt'] = getFacetScore('artistic_interests') >= high_min;
  flags['HighAnx'] = getFacetScore('anxiety') >= high_min;
  flags['LowAnx'] = getFacetScore('anxiety') <= low_max;

  // Generate sections using JSON content
  const sections: Array<{ title: string; body: string[] }> = [];

  const renderOrder = (operationManualContent as any).render_order || [
    'best_roles',
    'avoid_roles',
    'ideal_teammates',
    'decision_rules',
    'negotiation_style',
    'anti_burnout',
    'fix_disorganization',
    'communication',
    'reduce_friction',
    'practice_30d',
    'ideal_cofounder',
    'work_rhythm',
    'personal_boundaries'
  ];

  for (const sectionKey of renderOrder) {
    const sectionConfig = (operationManualContent as any).sections?.[sectionKey];
    if (!sectionConfig) continue;

    const sectionBody: string[] = [];

    if (sectionConfig.blocks) {
      // Handle blocks-based sections
      for (const block of sectionConfig.blocks) {
        if (evaluateCondition(block.when, flags)) {
          if (block.bullets) {
            sectionBody.push(...block.bullets.map((bullet: string) => `* ${bullet}`));
          }
          if (block.template) {
            sectionBody.push(...block.template);
          }
          if (block.before || block.during || block.after) {
            if (block.before) sectionBody.push(`Before: ${block.before}`);
            if (block.during) sectionBody.push(`During: ${block.during}`);
            if (block.after) sectionBody.push(`After: ${block.after}`);
          }
          // For most sections, only take first matching block
          if (sectionKey !== 'best_roles' && sectionKey !== 'avoid_roles') {
            break;
          }
        }
      }
    }

    if (sectionConfig.tracks) {
      // Handle decision rules
      for (const track of sectionConfig.tracks) {
        if (evaluateCondition(track.when, flags)) {
          sectionBody.push(`* **${track.name}**: ${track.text}`);
        }
      }
    }

    if (sectionConfig.patterns) {
      // Handle anti-burnout patterns
      for (const pattern of sectionConfig.patterns) {
        if (evaluateCondition(pattern.when, flags)) {
          sectionBody.push(pattern.summary);
          if (pattern.metrics) {
            sectionBody.push('Track three weekly numbers:');
            sectionBody.push('');
            pattern.metrics.forEach((metric: { name: string; target: string }, idx: number) => {
              sectionBody.push(`${idx + 1}. ${metric.name} (${metric.target}).`);
            });
            sectionBody.push('');
            sectionBody.push(pattern.reset_rule);
          }
          break;
        }
      }
    }

    if (sectionConfig.traits && sectionConfig.intro) {
      // Handle ideal teammates
      const matchingTraits = sectionConfig.traits.filter((trait: { when: string; text: string }) => 
        evaluateCondition(trait.when, flags)
      );
      
      if (matchingTraits.length > 0) {
        sectionBody.push(sectionConfig.intro);
        matchingTraits.forEach((trait: { when: string; text: string }) => {
          sectionBody.push(`* ${trait.text}`);
        });
        sectionBody.push('');
        sectionBody.push('Ask them questions that reveal those traits:');
        sectionConfig.screen_prompts.slice(0, matchingTraits.length).forEach((prompt: string) => {
          sectionBody.push(`* ${prompt}`);
        });
      }
    }

    // Add section if it has content
    if (sectionBody.length > 0) {
      sections.push({
        title: `${sections.length + 1}. ${sectionConfig.title}`,
        body: sectionBody
      });
    }
  }

  return {
    title: 'Here\'s your profile rewritten in plain English:',
    sections
  };
}

function OperationReportContent() {
  const router = useRouter();
  const search = useSearchParams();
  const rid = search?.get('rid') || '';
  const [report, setReport] = useState<DynamicReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    
    (async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Require rid for paid content
        if (!rid) {
          setError('Missing assessment ID. Please access this page through the upgrades section.');
          setLoading(false);
          return;
        }
        
        let results: any[] = [];
        
        // Try to load from server by rid
        try {
          const res = await fetch(`/api/who/${rid}`, { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            results = Array.isArray(data?.results) ? data.results : [];
          } else {
            setError('Assessment results not found. Please complete an assessment first.');
            setLoading(false);
            return;
          }
        } catch (e) {
          setError('Failed to load assessment results. Please try again.');
          setLoading(false);
          return;
        }
        
        // Fallback to localStorage if no server data
        if (results.length === 0) {
          const raw = localStorage.getItem('gz_full_results');
          if (raw) {
            results = JSON.parse(raw);
          }
        }
        
        if (results.length === 0) {
          setError('No assessment results found. Please complete an assessment first.');
          setLoading(false);
          return;
        }
        
        // Generate report from JSON
        const generatedReport = generateReportFromJSON(results);
        setReport(generatedReport);
        setLoading(false);
      } catch (err) {
        console.error('Error generating report:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate report');
        setLoading(false);
      }
    })();
  }, [mounted, rid]);

  if (!mounted) return null;
  
  if (loading) {
    return (
      <main className="app">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#fff', marginBottom: '12px' }}>Generating your Operating Manual...</div>
            <div style={{ fontSize: '14px', color: '#888' }}>Analyzing your assessment results...</div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '18px', color: '#e74c3c', marginBottom: '12px' }}>Error</div>
            <div style={{ fontSize: '14px', color: '#fff' }}>{error}</div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-gold"
                onClick={() => router.push('/upgrades' + (rid ? `?rid=${rid}` : ''))}
              >
                View Upgrades
              </button>
              <button
                className="btn btn-gold"
                onClick={() => router.push('/results' + (rid ? `?rid=${rid}` : ''))}
              >
                Back to Results
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <main className="app">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div className="card" style={{ marginBottom: '32px', padding: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#fff', marginBottom: '24px', lineHeight: 1.4 }}>
            {report.title}
          </h1>
          
          {report.sections.map((section, idx) => (
            <div key={idx}>
              {idx > 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  margin: '40px 0 32px 0', 
                  color: '#666',
                  fontSize: '18px'
                }}>
                  ---
                </div>
              )}
              
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: 600, 
                  marginBottom: '16px', 
                  color: '#fff'
                }}>
                  {section.title}
                </h3>
                
                <div style={{ color: '#e0e0e0', lineHeight: 1.8, fontSize: '15px' }}>
                  {section.body.map((item, i) => {
                    if (item.startsWith('* ')) {
                      return (
                        <div key={i} style={{ 
                          marginBottom: '8px', 
                          paddingLeft: '0px',
                          display: 'flex',
                          alignItems: 'flex-start'
                        }}>
                          <span style={{ color: '#d4af37', marginRight: '8px', fontSize: '16px' }}>•</span>
                          <span dangerouslySetInnerHTML={{ 
                            __html: item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>') 
                          }} />
                        </div>
                      );
                    } else if (item.match(/^\d+\./)) {
                      return (
                        <div key={i} style={{ marginBottom: '8px', paddingLeft: '0px' }}>
                          <span dangerouslySetInnerHTML={{ 
                            __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>') 
                          }} />
                        </div>
                      );
                    } else if (item === '') {
                      return <div key={i} style={{ marginBottom: '12px' }} />;
                    } else if (item.includes('**')) {
                      return (
                        <div key={i} style={{ marginBottom: '12px' }}>
                          <span dangerouslySetInnerHTML={{ 
                            __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #fff;">$1</strong>') 
                          }} />
                        </div>
                      );
                    } else {
                      return (
                        <div key={i} style={{ marginBottom: '12px' }}>
                          {item}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Final separator and closing note */}
          <div style={{ 
            textAlign: 'center', 
            margin: '40px 0 24px 0', 
            color: '#666',
            fontSize: '18px'
          }}>
            ---
          </div>
          
          <div style={{ 
            textAlign: 'center', 
            color: '#ccc', 
            fontSize: '15px', 
            fontStyle: 'italic',
            lineHeight: 1.6
          }}>
            If you want, I can make this into a clear one-page "Operating Manual" PDF you can share or keep for yourself. Want that?
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px', gap: '12px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-gold"
            onClick={() => router.push('/upgrades' + (rid ? `?rid=${rid}` : ''))}
          >
            View Other Upgrades
          </button>
          <button
            className="btn btn-gold"
            onClick={() => router.push('/results' + (rid ? `?rid=${rid}` : ''))}
          >
            Back to Results
          </button>
        </div>
      </div>
    </main>
  );
}

export default function OperationReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OperationReportContent />
    </Suspense>
  );
}
