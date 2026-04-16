// Ephemeral in-memory session store keyed by cookie.
import type { DomainKey } from "@/lib/bigfive/constants";

export type StepState = {
  p1?: { picksP: Record<string,number>; picksM: Record<string,number>; picksT: Record<string,number>; prior: Record<string,number> };
  p2?: { answers: Array<{facet:string; idx:number; value:number}>; A_raw: Record<string,number> };
  p3?: { asked: Array<{facet:string; answer:'Yes'|'No'|'Maybe'}> };
};
export type DomainSummary = { domain: DomainKey; payload: any };

export type Session = {
  id: string;
  idx: number;
  domains: DomainKey[];
  scratch: StepState;
  results: DomainSummary[];
  createdAt: number;
};

// Use a global singleton Map to survive dev hot reloads / module reloads
const g = globalThis as any;
if (!g.__gz_session_store) {
  g.__gz_session_store = new Map<string, Session>();
}
const store: Map<string, Session> = g.__gz_session_store;

export function newId(){ return Math.random().toString(36).slice(2,10); }
export function create(domains: DomainKey[]): Session{
  const s: Session = { id: newId(), idx: 0, domains, scratch:{}, results: [], createdAt: Date.now() };
  store.set(s.id, s);
  return s;
}
export function get(id: string){ return store.get(id) || null; }
export function save(s: Session){ store.set(s.id, s); }
export function del(id: string){ store.delete(id); }
