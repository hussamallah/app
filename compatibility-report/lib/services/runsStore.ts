type RunRecord = Array<{ domain: string; payload: any }>;
import { getSupabaseAdmin } from "@/lib/server/supabase";

const UPSTASH_URL = (process.env.UPSTASH_REDIS_REST_URL || "").trim();
const UPSTASH_TOKEN = (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim();

// Fallback in-memory store (non-persistent, per server instance)
const g = globalThis as any;
if (!g.__gz_runs_store) {
  g.__gz_runs_store = new Map<string, RunRecord>();
}
const memoryStore: Map<string, RunRecord> = g.__gz_runs_store;

async function upstashSet(key: string, value: string): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: 'SET', args: [key, value] })
    });
    if (!res.ok) return false;
    const data = await res.json().catch(()=>null);
    return !!data;
  } catch { return false; }
}

async function upstashGet(key: string): Promise<string | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  try {
    const res = await fetch(UPSTASH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ command: 'GET', args: [key] })
    });
    if (!res.ok) return null;
    const data = await res.json().catch(()=>null) as any;
    if (!data) return null;
    // Upstash returns { result: "..." }
    return typeof data.result === 'string' ? data.result : null;
  } catch { return null; }
}

export async function saveRun(hash: string, results: RunRecord): Promise<void> {
  const key = `gz:run:${hash}`;
  const value = JSON.stringify(results);
  
  // Try Supabase first
  try {
    const supa = getSupabaseAdmin();
    if (!supa) {
      console.warn('⚠️ Supabase client not initialized - check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    } else {
      console.log(`📤 Attempting to save to Supabase: ${hash}`);
      const { error } = await supa
        .from('gz_runs')
        .upsert({ hash, results }, { onConflict: 'hash' });
      if (error) {
        console.error('❌ Supabase error:', error);
      } else {
        console.log(`✅ Successfully saved to Supabase: ${hash}`);
        return;
      }
    }
  } catch (supaErr: any) {
    console.error('❌ Supabase exception:', supaErr?.message || supaErr);
  }
  
  // Fallback to Upstash
  const ok = await upstashSet(key, value);
  if (!ok) {
    console.warn('⚠️ Falling back to memory store');
    memoryStore.set(key, results);
  }
}

export async function getRun(hash: string): Promise<RunRecord | null> {
  const key = `gz:run:${hash}`;
  // Try Supabase first
  try {
    const supa = getSupabaseAdmin();
    if (supa) {
      const { data, error } = await supa
        .from('gz_runs')
        .select('results')
        .eq('hash', hash)
        .single();
      if (!error && data && Array.isArray(data.results)) return data.results as RunRecord;
    }
  } catch {}
  const fromRemote = await upstashGet(key);
  if (fromRemote) {
    try { return JSON.parse(fromRemote) as RunRecord; } catch { return null; }
  }
  if (memoryStore.has(key)) {
    return memoryStore.get(key)!;
  }
  return null;
}


