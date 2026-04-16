import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Engine from "@/app/(server)/engine";
import * as S from "@/app/(server)/session";
import { saveRun } from "@/lib/services/runsStore";

export async function POST(req: NextRequest){
  const sid = cookies().get("gz_sid")?.value;
  if (!sid) return NextResponse.json({ error: "no-session" }, { status: 400 });
  const s = S.get(sid);
  if (!s || !s.scratch.p1 || !s.scratch.p2) return NextResponse.json({ error: "bad-session" }, { status: 400 });

  const body = await req.json();
  const asked = Array.isArray(body?.asked) ? body.asked as Array<{facet:string; answer:'Yes'|'No'|'Maybe'}> : [];
  const domain = s.domains[s.idx];
  const facets = Engine.facetsOf(domain);

  const summary = Engine.finalizeDomain(s.scratch.p2.A_raw, s.scratch.p1.prior, asked, domain, facets);
  const payload = {
    version: Engine.VERSION,
    domain,
    phase1: { p: s.scratch.p1.picksP, m: s.scratch.p1.picksM, t: s.scratch.p1.picksT, P: s.scratch.p1.prior },
    phase2: { answers: s.scratch.p2.answers, A_raw: s.scratch.p2.A_raw },
    phase3: { asked },
    final: summary,
    audit: {}
  };
  s.results.push({ domain, payload });

  s.idx += 1;
  s.scratch = {};
  S.save(s);

  if (s.idx < s.domains.length){
    const next = s.domains[s.idx];
    const ui = { domain: next, label: Engine.domainLabel(next), prompts: Engine.p1Prompts(next), facets: Engine.facetsOf(next) };
    return NextResponse.json({ step: "p1", ui });
  }

  const rid = Engine.resultHashFromRuns(s.results);
  try { await saveRun(rid, s.results as any); } catch {}
  S.del(sid);

  const res = NextResponse.json({ step: "done", rid, redirect: `/your-id?rid=${rid}` });
  res.cookies.set("gz_last_rid", rid, { httpOnly: false, sameSite: "lax", path: "/" });
  return res;
}
