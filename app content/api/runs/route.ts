import { NextRequest, NextResponse } from "next/server";
import { saveRun } from "@/lib/services/runsStore";
import { stableStringify } from "@/lib/bigfive/format";
import crypto from "node:crypto";

function ridFor(results: Array<{domain:string; payload:any}>): string {
  const normalized = results.map(r=> ({ domain: r.domain, payload: r.payload }));
  const json = stableStringify(normalized);
  return crypto.createHash('sha256').update(Buffer.from(json,'utf8')).digest('hex').slice(0, 24);
}

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const results = Array.isArray(body?.results) ? body.results as Array<{domain:string; payload:any}> : null;
    if (!results || results.length===0) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const rid = ridFor(results);
    
    // Try to save and log any errors
    try { 
      await saveRun(rid, results as any);
      console.log(`✅ Saved run ${rid} to database`);
    } catch(saveErr: any) {
      console.error(`❌ Failed to save run ${rid}:`, saveErr?.message || saveErr);
    }
    
    const res = NextResponse.json({ rid });
    res.cookies.set('gz_last_rid', rid, { httpOnly: false, sameSite: 'lax', path: '/' });
    return res;
  } catch(err:any){
    console.error('❌ API /runs error:', err);
    return NextResponse.json({ error: err?.message || 'failed' }, { status: 500 });
  }
}


