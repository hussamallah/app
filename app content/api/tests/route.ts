import { NextRequest, NextResponse } from 'next/server';
import { stableStringify } from '@/lib/bigfive/format';
import { sha256 } from '@/lib/crypto/sha256';
import { VERSION } from '@/lib/bigfive/constants';
import { buildWhoFromFullResults } from '@/lib/bigfive/who';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const answers = Array.isArray(body?.answers) ? body.answers : null;
    const lang = typeof body?.lang === 'string' ? body.lang : 'en';
    const timeElapsed = typeof body?.timeElapsed === 'number' ? body.timeElapsed : null;
    if (!answers) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    
    // Generate a unique ID and store in localStorage (client-side)
    const normalized = answers.map((r:any)=>({domain:r.domain, payload:r.payload}));
    let suiteHash: string | null = null;
    try { suiteHash = await sha256(stableStringify(normalized)); } catch {}
    let whoView: any = null;
    try { whoView = await buildWhoFromFullResults(answers, suiteHash); } catch {}
    
    // Generate a unique ID for the session
    const sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Return the session ID - the client will handle storage
    return NextResponse.json({ 
      id: sessionId,
      suiteHash,
      whoView,
      message: 'Results stored locally in browser'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 });
  }
}


