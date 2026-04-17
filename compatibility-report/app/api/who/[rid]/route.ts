import { NextResponse } from "next/server";
import { getRun } from "@/lib/services/runsStore";
import { buildWhoFromFullResults } from "@/lib/bigfive/who";
import { buildHandoff } from "@/lib/bigfive/handoff";

export async function GET(_: Request, { params }: { params: { rid: string } }){
  const rid = params.rid;
  const data = await getRun(rid);
  if (!data) {
    // Check if database is configured
    const hasSupabase = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    const dbConfigured = hasSupabase || hasUpstash;
    
    return NextResponse.json({ 
      error: "not-found",
      message: dbConfigured 
        ? "Result not found. The code may be invalid or expired."
        : "Database not configured. Results can only be viewed on the same device where you took the assessment. To enable cross-device retrieval, configure Supabase or Upstash in your environment variables."
    }, { status: 404 });
  }
  const who = await buildWhoFromFullResults(data as any, rid);
  const handoff = await buildHandoff(data as any, rid);
  return NextResponse.json({ rid, results: data, who, handoff });
}
