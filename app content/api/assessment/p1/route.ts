import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Engine from "@/app/(server)/engine";
import * as S from "@/app/(server)/session";

export async function POST(req: NextRequest){
  const sid = cookies().get("gz_sid")?.value;
  if (!sid) return NextResponse.json({ error: "no-session" }, { status: 400 });
  const s = S.get(sid);
  if (!s) return NextResponse.json({ error: "bad-session" }, { status: 400 });

  const body = await req.json();
  const picksP = body?.picksP || null;
  const picksM = body?.picksM || null;
  const picksT = body?.picksT || null;
  if (!picksP || !picksM || !picksT) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const domain = s.domains[s.idx];
  const facets = Engine.facetsOf(domain);
  const prior = Engine.computePrior(picksP, picksT, picksM, facets);
  s.scratch.p1 = { picksP, picksM, picksT, prior };

  const budget = Engine.anchorsBudget(prior, facets, domain);
  const queue: Array<{facet:string; idx:number; prompt:string}> = [];
  for (const f of facets){
    for (let i=0;i<budget[f];i++){
      queue.push({ facet:f, idx:i, prompt: Engine.anchorPrompt(domain, f, i) });
    }
  }
  S.save(s);
  return NextResponse.json({ step: "p2", ui: { domain, label: Engine.domainLabel(domain), queue } });
}
