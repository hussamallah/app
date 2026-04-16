"use client";

import { useEffect, useState, Suspense } from "react";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { DomainKey, canonicalFacets } from "@/lib/bigfive/constants";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { selectFiveCards } from '@/lib/bigfive/fiveCardSelector';
import ExistentialCircuits from '@/components/who/ExistentialCircuits';

// IMPORTANT: point this to your v4 JSON (the "max" spec you approved)

import operationManualContent from "@/operation-manual-empty.json";



/** ---------- Constants ---------- */

const DOMAIN_MAP: Record<DomainKey, string> = {

  O: "Openness",

  C: "Conscientiousness",

  E: "Extraversion",

  A: "Agreeableness",

  N: "Neuroticism",

};



type SectionBody = { title: string; body: string[] };

interface DynamicReport { title: string; sections: SectionBody[]; }

const Stars = ({ count }: { count: number }) => (
    <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < count ? 'text-yellow-300' : 'text-white/20'}>★</span>
        ))}
    </div>
);

function ConflictPatternsDisplay({ fullResults }: { fullResults: any[] }) {
    if (!fullResults || fullResults.length === 0) return null;

    const facets: Array<{ domain: DomainKey; facet: string; raw: number; bucket: 'High' | 'Medium' | 'Low' }> = [];
    for (const d of ['O', 'C', 'E', 'A', 'N'] as DomainKey[]) {
        const payload = (fullResults.find(r => r.domain === d) || ({} as any)).payload;
        if (!payload) continue;
        const A_raw = (payload?.phase2?.A_raw || {}) as Record<string, number>;
        const bucket = (payload?.final?.bucket || {}) as Record<string, 'High' | 'Medium' | 'Low'>;
        for (const f of canonicalFacets(d)) {
            const raw = Number(A_raw?.[f] ?? 3);
            const b = (bucket?.[f] as any) as 'High' | 'Medium' | 'Low' || 'Medium';
            facets.push({ domain: d, facet: f, raw, bucket: b });
        }
    }
    const cards = selectFiveCards(facets).filter((c: any) => c.type === 'conflict');
    function neonBorderStyle() {
        const glow = 'rgba(212,175,55,0.6)';
        const wide = 'rgba(212,175,55,0.25)';
        const border = 'rgba(212,175,55,0.5)';
        return { borderColor: border, boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}, 0 0 40px ${wide}` } as any;
    }

    return (
        <div>
            <div style={{ textAlign: "center", margin: "40px 0 32px 0", color: "#666", fontSize: 18 }}>---</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "#fff" }}>Conflict Patterns</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {cards.map((card: any, i: number) => {
                    const avgPct = card.leftPct && card.rightPct ? (card.leftPct + card.rightPct) / 2 : 50;
                    const stars = avgPct >= 80 ? 5 : avgPct >= 60 ? 4 : avgPct >= 40 ? 3 : avgPct >= 20 ? 2 : 1;
                    return (
                        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4" style={neonBorderStyle()}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-white">{card.facet}</h3>
                                <Stars count={stars} />
                            </div>
                            {typeof card.explanation === 'string' ? (
                                <p className="text-white/90 text-sm mb-2">{card.explanation}</p>
                            ) : null}
                            {typeof card.friction === 'string' ? (
                                <p className="text-white/80 text-xs mb-3">{card.friction}</p>
                            ) : null}
                            {typeof card.how_can_both_be_true === 'string' ? (
                                <div className="rounded-md border border-white/10 bg-black/30 p-3">
                                    <div className="text-xs text-white/60 mb-1">How can both be true?</div>
                                    <p className="text-white/90 text-sm">{card.how_can_both_be_true}</p>
                                </div>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function ExistentialCircuitsDisplay({ domainMeans, fullResults }: { domainMeans: any, fullResults: any[] }) {
    if (!domainMeans || !fullResults || fullResults.length === 0) return null;

    return (
        <div style={{
            ['--bg-color' as any]: '#121212',
            ['--surface-color' as any]: '#1e1e1e',
            ['--primary-text-color' as any]: '#e0e0e0',
            ['--secondary-text-color' as any]: '#a0a0a0',
            ['--accent-color' as any]: '#d4af37',
            ['--border-color' as any]: '#333',
            ['--progress-green' as any]: '#2ecc71',
            ['--progress-yellow' as any]: '#f1c40f',
            ['--progress-red' as any]: '#e74c3c',
        }}>
            <div style={{ textAlign: "center", margin: "40px 0 32px 0", color: "#666", fontSize: 18 }}>---</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "#fff" }}>Existential Circuits</h3>
            <ExistentialCircuits domainMeans={domainMeans} fullResults={fullResults} />
        </div>
    );
}


/** ---------- Bucketing (6→3) ---------- */

function bucket6(score: number): string {

  const anchors = [

    { score: 1.0, label: "low low" },

    { score: 2.0, label: "high low" },

    { score: 2.5, label: "low medium" },

    { score: 3.0, label: "high medium" },

    { score: 4.0, label: "high score low" },

    { score: 5.0, label: "high score high" }

  ];

  let best = anchors[0];

  let d = Math.abs(score - best.score);

  for (const a of anchors) {

    const da = Math.abs(score - a.score);

    if (da < d || (da === d && a.score > best.score)) { best = a; d = da; }

  }

  return best.label;

}

function bucket3(score: number): "low"|"medium"|"high" {

  const l = bucket6(score);

  if (l === "low low" || l === "high low") return "low";

  if (l === "low medium" || l === "high medium") return "medium";

  return "high";

}

function is3(score: number, label: string) { return bucket3(score) === label; }

function is6(score: number, label: string) { return bucket6(score) === label; }



/** ---------- Score context ---------- */

type ScoreContext = {

  domains: Record<string, number>;

  facets: Record<string, number>;

  getFacet: (name: string) => number;

};



function buildScoreContext(results: any[]): ScoreContext {

  const domainScores: Record<string, number> = {};

  const facetScores: Record<string, number> = {};

  for (const r of results) {

    const dk = r.domain as DomainKey;

    if (!dk || !DOMAIN_MAP[dk]) continue;

    const name = DOMAIN_MAP[dk];

    const payload = r.payload || {};

    const final = payload.final || {};

    const domainMean = typeof final.domain_mean_raw === "number" ? final.domain_mean_raw : 3;

    domainScores[name] = domainMean;



    // Facets: prefer final.A_raw; fallback phase2.A_raw; fallback final.facet_raw

    const facetPack = final.A_raw || payload.phase2?.A_raw || final.facet_raw || {};

    for (const [k, v] of Object.entries(facetPack)) {

      if (typeof v === "number") facetScores[k] = v;

    }

  }

  return {

    domains: domainScores,

    facets: facetScores,

    getFacet: (raw: string) => {

      if (raw in facetScores && typeof facetScores[raw] === "number") return facetScores[raw];

      const norm = raw.toLowerCase().replace(/[\s\-_]/g, "");

      for (const [k, v] of Object.entries(facetScores)) {

        if (k.toLowerCase().replace(/[\s\-_]/g, "") === norm) return v as number;

      }

      return 3;

    }

  };

}



/** ---------- Condition evaluation ---------- */

/* Safe-ish boolean evaluator:

   1) Replace domain names -> numeric.

   2) Replace facet('x') -> numeric.

   3) Reduce is3()/is6() -> true/false.

   4) Replace precomputed flags -> true/false.

   5) Ensure only [true|false|!|&&|||, parens, spaces] remain, then eval via Function.

*/

function evaluateCondition(condition: string | undefined, ctx: ScoreContext, flags?: Record<string, boolean>): boolean {

  if (!condition || condition.trim() === "" || condition === "true") return true;



  let s = condition;



  // Replace flag identifiers first to support expressions using HighE etc.

  if (flags) {

    // Sort by length desc to avoid partial replacements

    const flagKeys = Object.keys(flags).sort((a, b) => b.length - a.length);

    for (const key of flagKeys) {

      const val = flags[key] ? "true" : "false";

      s = s.replace(new RegExp(`\\b${key}\\b`, "g"), val);

    }

  }



  // Replace domain names with numeric literals

  for (const domain of Object.values(DOMAIN_MAP)) {

    const val = (ctx.domains[domain] ?? 3).toString();

    s = s.replace(new RegExp(`\\b${domain}\\b`, "g"), val);

  }



  // Replace facet('Name') calls with numbers

  s = s.replace(/facet\('([^']+)'\)/g, (_m, fname) => {

    const v = ctx.getFacet(fname);

    return String(v);

  });



  // Reduce is3 and is6 to boolean literals

  s = s.replace(/is3\(\s*([0-9.]+)\s*,\s*'([^']+)'\s*\)/g, (_m, num, lab) => String(is3(parseFloat(num), lab)));

  s = s.replace(/is6\(\s*([0-9.]+)\s*,\s*'([^']+)'\s*\)/g, (_m, num, lab) => String(is6(parseFloat(num), lab)));



  // Normalize operators

  s = s.replace(/\s+/g, " ").trim();



  // Safety gate: allow only booleans, operators, parentheses

  const safe = s.replace(/\btrue\b|\bfalse\b|!|\(|\)|\&\&|\|\|/g, "");

  if (safe.trim() !== "") {

    // If anything else remains, do not execute

    return false;

  }



  try {

    // eslint-disable-next-line no-new-func

    return Boolean(new Function(`return (${s});`)());

  } catch {

    return false;

  }

}



/** ---------- Flag derivation from JSON ---------- */

function deriveFlags(ctx: ScoreContext): Record<string, boolean> {

  const out: Record<string, boolean> = {};

  const defs = operationManualContent?.engine?.derived_flags || [];

  for (const def of defs) {

    out[def.key] = evaluateCondition(def.expr, ctx, out);

  }

  return out;

}



/** ---------- Scoring and selection ---------- */

function blockScore(block: any, ctx: ScoreContext, flags: Record<string, boolean>): number {

  let score = typeof block.base_score === "number" ? block.base_score : 0;

  if (Array.isArray(block.score_rules)) {

    for (const rule of block.score_rules) {

      if (evaluateCondition(rule.when, ctx, flags)) score += Number(rule.add || 0);

    }

  }

  // Specificity bonus: facet refs > flag refs > domain refs

  const expr = String(block.when || "");

  const facetRefs = (expr.match(/facet\('/g) || []).length;

  const flagRefs = (expr.match(/\b[A-Z][A-Za-z0-9_]*\b/g) || []).length; // rough

  const domainRefs = (expr.match(/\b(Openness|Conscientiousness|Extraversion|Agreeableness|Neuroticism)\b/g) || []).length;

  score += facetRefs * 0.3 + flagRefs * 0.1 + domainRefs * 0.05;



  // Priority override if provided

  if (typeof block.priority === "number") score += block.priority;

  return score;

}



function pickBlocks(blocks: any[], perSectionLimit: number, ctx: ScoreContext, flags: Record<string, boolean>): any[] {

  const matched = blocks

    .map(b => ({ b, ok: evaluateCondition(b.when, ctx, flags), sc: 0 }))

    .filter(x => x.ok)

    .map(x => ({ ...x, sc: blockScore(x.b, ctx, flags) }));



  // Sort: score desc, then fewer bullets, then id asc

  matched.sort((a, b) => {

    if (b.sc !== a.sc) return b.sc - a.sc;

    const al = (a.b.bullets?.length || 0) + (a.b.template?.length || 0);

    const bl = (b.b.bullets?.length || 0) + (b.b.template?.length || 0);

    if (al !== bl) return al - bl;

    return String(a.b.id || "").localeCompare(String(b.b.id || ""));

  });



  // Enforce cap

  const selected = matched.slice(0, Math.max(1, perSectionLimit)).map(x => x.b);



  // If none selected and there is a default block (priority < 0 or explicit default), include it

  if (selected.length === 0) {

    const fallback = blocks.find(b => b.default === true || (typeof b.priority === "number" && b.priority < 0) || b.when === "true");

    if (fallback) selected.push(fallback);

  }

  return selected;

}



/** ---------- Rendering helpers ---------- */

function asBullets(arr: string[] | undefined): string[] {

  if (!arr || !Array.isArray(arr)) return [];

  return arr.map(s => s.startsWith("* ") ? s : `* ${s}`);

}



function renderSection(sectionKey: string, sectionCfg: any, ctx: ScoreContext, flags: Record<string, boolean>, caps: any): SectionBody | null {

  const title = sectionCfg.title || sectionKey;

  const body: string[] = [];



  const perLimit = Number(caps?.[sectionKey] ?? 1);



  if (Array.isArray(sectionCfg.blocks)) {

    const chosen = pickBlocks(sectionCfg.blocks, perLimit, ctx, flags);

    // Special case: ideal_teammates intro + bullets + prompts

    if (sectionKey === "ideal_teammates") {

      if (sectionCfg.intro) body.push(sectionCfg.intro);

      for (const blk of chosen) body.push(...asBullets(blk.bullets));

      if (Array.isArray(sectionCfg.screen_prompts) && sectionCfg.screen_prompts.length) {

        body.push("");

        body.push("Ask them questions that reveal those traits:");

        for (const p of sectionCfg.screen_prompts.slice(0, chosen.length || 1)) body.push(`* ${p}`);

      }

    } else {

      for (const blk of chosen) {

        if (blk.bullets) body.push(...asBullets(blk.bullets));

        if (blk.template) body.push(...blk.template);

        if (blk.before || blk.during || blk.after) {

          if (blk.before) body.push(`Before: ${blk.before}`);

          if (blk.during) body.push(`During: ${blk.during}`);

          if (blk.after) body.push(`After: ${blk.after}`);

        }

      }

    }

  }



  if (Array.isArray(sectionCfg.tracks)) {

    const tracks = sectionCfg.tracks.filter((t: any) => evaluateCondition(t.when, ctx, flags));

    const limit = Math.min(perLimit, 3);

    for (const t of tracks.slice(0, limit)) body.push(`* **${t.name}**: ${t.text}`);

  }



  if (Array.isArray(sectionCfg.patterns)) {

    const patt = sectionCfg.patterns.find((p: any) => evaluateCondition(p.when, ctx, flags));

    if (patt) {

      body.push(patt.summary);

      if (Array.isArray(patt.metrics) && patt.metrics.length) {

        body.push("Track three weekly numbers:");

        body.push("");

        patt.metrics.forEach((m: string, i: number) => body.push(`${i + 1}. ${m}`));

        body.push("");

        if (patt.reset_rule) body.push(patt.reset_rule);

      }

    } else if (sectionCfg.default?.summary) {

      body.push(sectionCfg.default.summary);

    }

  }



  if (Array.isArray(sectionCfg.items)) {

    const items = sectionCfg.items.filter((it: any) => evaluateCondition(it.when, ctx, flags)).slice(0, perLimit);

    for (const it of items) body.push(`* **${it.name}**: ${it.text}`);

  }



  if (Array.isArray(sectionCfg.rules)) {

    const rules = sectionCfg.rules.filter((r: any) => evaluateCondition(r.when, ctx, flags));

    for (const r of rules) body.push(`* ${r.text}`);

  }



  // Quality caps: min bullets

  const minBullets = Number(operationManualContent?.selection?.quality_caps?.min_bullets ?? 0);

  if (minBullets > 0) {

    const bcount = body.filter(x => x.startsWith("* ")).length;

    if (bcount < minBullets) {

      const fb = sectionCfg.blocks?.find((b: any) => b.default === true || (typeof b.priority === "number" && b.priority < 0) || b.when === "true");

      if (fb?.bullets) {

        for (const b of fb.bullets) {

          if (body.filter(x => x.startsWith("* ")).length >= minBullets) break;

          if (!body.includes(`* ${b}`)) body.push(`* ${b}`);

        }

      }

    }

  }



  if (body.length === 0) return null;

  return { title: `${titlePrefixIndex++}. ${title}`, body };

}



let titlePrefixIndex = 1;



/** ---------- Report generation ---------- */

function generateReport(results: any[]): DynamicReport {

  const ctx = buildScoreContext(results);

  const flags = deriveFlags(ctx);

  const order: string[] = (operationManualContent as any)?.render_order || [

    "best_roles","avoid_roles","ideal_teammates","decision_rules","negotiation_style",

    "anti_burnout","fix_disorganization","communication","reduce_friction",

    "practice_30d","ideal_cofounder","work_rhythm","personal_boundaries"

  ];

  const caps = operationManualContent?.selection?.per_section || {};

  titlePrefixIndex = 1;



  const sections: SectionBody[] = [];

  for (const key of order) {

    const cfg = (operationManualContent as any)?.sections?.[key];

    if (!cfg) continue;

    const sec = renderSection(key, cfg, ctx, flags, caps);

    if (sec) sections.push(sec);

  }



  if (sections.length === 0) {

    sections.push({

      title: "1. Getting Started",

      body: [

        "Your personalized operating manual is being generated.",

        "* Focus on your natural strengths",

        "* Build teams that complement your style",

        "* Make decisions that fit your personality"

      ]

    });

  }



  return { title: "Here's your profile rewritten in plain English:", sections };

}



/** ---------- React component ---------- */

function OperationReportContent() {

  const router = useRouter();

  const search = useSearchParams();

  const rid = search?.get("rid") || "";

  const [report, setReport] = useState<DynamicReport | null>(null);
  const [fullResults, setFullResults] = useState<any[]>([]);
  const [domainMeans, setDomainMeans] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);



  useEffect(() => setMounted(true), []);



  useEffect(() => {

    if (!mounted) return;

    (async () => {

      try {

        setLoading(true);

        setError(null);



        if (!rid) { setError("Missing assessment ID. Open from the upgrades section."); setLoading(false); return; }



        let results: any[] = [];
        let apiData: any = null;

        try {

          const res = await fetch(`/api/who/${rid}`, { cache: "no-store" });

          if (res.ok) {

            apiData = await res.json();

            results = Array.isArray(apiData?.results) ? apiData.results : [];

          } else {

            setError("Assessment results not found. Complete an assessment first."); setLoading(false); return;

          }

        } catch {

          // fallback to localStorage

        }



        if (results.length === 0) {

          const raw = typeof window !== "undefined" ? localStorage.getItem("gz_full_results") : null;

          if (raw) results = JSON.parse(raw);

        }



        if (results.length === 0) { setError("No assessment results found."); setLoading(false); return; }


        setFullResults(results);
        if (apiData) {
            setDomainMeans(apiData?.who?.derived?.domainMeans || null);
        }
        const generated = generateReport(results);

        setReport(generated);

        setLoading(false);

      } catch (err: any) {

        setError(err?.message || "Failed to generate report");

        setLoading(false);

      }

    })();

  }, [mounted, rid]);



  if (!mounted) return null;



  const downloadPdf = async () => {
    setIsGeneratingPdf(true);
    const reportContent = document.getElementById('report-content');
    if (reportContent) {
      const canvas = await html2canvas(reportContent, {
        scale: 2,
        backgroundColor: '#121212',
        onclone: (document) => {
          const content = document.getElementById('report-content');
          if(content) {
            content.style.color = 'black';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = imgWidth / imgHeight;
      const width = pdfWidth;
      const height = width / ratio;
      let position = 0;
      let heightLeft = height;

      pdf.addImage(imgData, 'PNG', 0, position, width, height);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - height;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, width, height);
        heightLeft -= pdfHeight;
      }
      
      pdf.save('Operating-Manual.pdf');
    }
    setIsGeneratingPdf(false);
  };


  if (loading) {

    return (

      <main className="app">

        <div className="card">

          <div style={{ textAlign: "center", padding: 40 }}>

            <div style={{ fontSize: 18, color: "#fff", marginBottom: 12 }}>Generating your Operating Manual...</div>

            <div style={{ fontSize: 14, color: "#888" }}>Analyzing your assessment results...</div>

          </div>

        </div>

      </main>

    );

  }



  if (error) {

    return (

      <main className="app">

        <div className="card">

          <div style={{ textAlign: "center", padding: 40 }}>

            <div style={{ fontSize: 18, color: "#e74c3c", marginBottom: 12 }}>Error</div>

            <div style={{ fontSize: 14, color: "#fff" }}>{error}</div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20 }}>

              <button className="btn btn-gold" onClick={() => router.push("/upgrades" + (rid ? `?rid=${rid}` : ""))}>View Upgrades</button>

              <button className="btn btn-gold" onClick={() => router.push("/results" + (rid ? `?rid=${rid}` : ""))}>Back to Results</button>

            </div>

          </div>

        </div>

      </main>

    );

  }



  if (!report) return null;



  return (

    <main className="app">
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

      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        <div id="report-content" className="card" style={{ marginBottom: 32, padding: 32 }}>



          {report.sections.map((section, idx) => (

            <div key={idx}>

              {idx > 0 && (

                <div style={{ textAlign: "center", margin: "40px 0 32px 0", color: "#666", fontSize: 18 }}>---</div>

              )}

              <div style={{ marginBottom: 32 }}>

                <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16, color: "#fff" }}>{section.title}</h3>

                <div style={{ color: "#e0e0e0", lineHeight: 1.8, fontSize: 15 }}>

                  {section.body.map((item, i) => {

                    if (item.startsWith("* ")) {

                      return (

                        <div key={i} style={{ marginBottom: 8, display: "flex", alignItems: "flex-start" }}>

                          <span style={{ color: "#d4af37", marginRight: 8 }}>•</span>

                          <span

                            dangerouslySetInnerHTML={{

                              __html: item.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>')

                            }}

                          />

                        </div>

                      );

                    } else if (/^\d+\./.test(item)) {

                      return (

                        <div key={i} style={{ marginBottom: 8 }}

                          dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>') }}

                        />

                      );

                    } else if (item === "") {

                      return <div key={i} style={{ marginBottom: 12 }} />;

                    } else if (item.includes("**")) {

                      return (

                        <div key={i} style={{ marginBottom: 12 }}

                          dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>') }}

                        />

                      );

                    } else {

                      return <div key={i} style={{ marginBottom: 12 }}>{item}</div>;

                    }

                  })}

                </div>

              </div>

            </div>

          ))}



          <ConflictPatternsDisplay fullResults={fullResults} />
          <ExistentialCircuitsDisplay domainMeans={domainMeans} fullResults={fullResults} />


          <div style={{ textAlign: "center", margin: "40px 0 24px 0", color: "#666", fontSize: 18 }}>---</div>

        </div>



        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>

          <button className="btn btn-gold" onClick={downloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
          </button>
          <button className="btn btn-gold" onClick={() => router.push("/upgrades" + (rid ? `?rid=${rid}` : ""))}>View Other Upgrades</button>

          <button className="btn btn-gold" onClick={() => router.push("/results" + (rid ? `?rid=${rid}` : ""))}>Back to Results</button>

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