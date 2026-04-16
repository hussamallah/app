import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Engine from "@/app/(server)/engine";
import * as S from "@/app/(server)/session";

export async function POST(req: NextRequest){
  const sid = cookies().get("gz_sid")?.value;
  if (!sid) return NextResponse.json({ error: "no-session" }, { status: 400 });
  const s = S.get(sid);
  if (!s || !s.scratch.p1) return NextResponse.json({ error: "bad-session" }, { status: 400 });

  const body = await req.json();
  const answers = Array.isArray(body?.answers) ? body.answers as Array<{facet:string; idx:number; value:number}> : null;
  if (!answers) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const domain = s.domains[s.idx];
  const facets = Engine.facetsOf(domain);

  const perFacet: Record<string, number[]> = Object.fromEntries(facets.map(f=> [f, []]));
  for (const a of answers){ perFacet[a.facet].push(a.value); }
  const A_raw: Record<string,number> = Object.fromEntries(facets.map(f=>{
    const arr = perFacet[f];
    const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 3.0;
    return [f, Math.round(avg*100)/100];
  })) as any;

  s.scratch.p2 = { answers, A_raw };
  const triggers = Engine.triggersForConfirmers(A_raw, s.scratch.p1.prior, domain);
  const confirmers = triggers.map(f => ({ facet: f, question: Engine.confirmQuestion(domain, f) }));
  S.save(s);

  return NextResponse.json({ step: "p3", ui: { domain, label: Engine.domainLabel(domain), confirmers } });
}
