import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as Engine from "@/app/(server)/engine";
import * as S from "@/app/(server)/session";

export async function POST(){
  const s = S.create(Engine.domainOrder());
  cookies().set("gz_sid", s.id, { httpOnly: true, sameSite: "lax", path: "/" });
  const domain = s.domains[s.idx];
  const ui = { domain, label: Engine.domainLabel(domain), prompts: Engine.p1Prompts(domain), facets: Engine.facetsOf(domain) };
  return NextResponse.json({ step: "p1", ui });
}
