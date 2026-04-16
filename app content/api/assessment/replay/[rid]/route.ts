import { NextResponse } from "next/server";
import { getRun } from "@/lib/services/runsStore";
import { replay } from "@/app/(server)/engine";

export async function GET(_: Request, { params }:{ params:{ rid: string } }){
  const rid = params.rid;
  const data = await getRun(rid);
  if (!data) return NextResponse.json({ error: "not-found" }, { status: 404 });
  try{
    const rep = replay(data as any);
    return NextResponse.json({ rid, replay: rep });
  } catch (e:any){
    return NextResponse.json({ error: "replay-failed", message: e?.message || 'failed' }, { status: 500 });
  }
}
