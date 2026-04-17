// Helper to compute life-signals (T,P,S,B,D,G,R,V,Y,L,F,U,M,I,K,Q) from Big-Five domain means
// Spec source: gzero-handback-1.0.json
// Formula helpers -----------------------------------------------------------
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
const z = (x: number): number => clamp01((x - 1) / 4);

export interface DomainMeans { O: number; C: number; E: number; A: number; N: number; }
export interface Signals {
  // Primary 16 signals (0-1)
  T: number; P: number; S: number; B: number; D: number; G: number; R: number; V: number;
  Y: number; L: number; F: number; U: number; M: number; I: number; K: number; Q: number;
  // Derived axes (raw numeric deltas)
  motionBalance: number;  // P − T
  socialStance:  number;  // F − U
  styleAxis:     number;  // V − Q
  // Discrete labels
  leadLabel:     'pursuit'|'threat'|'balanced';
  affiliationLabel: 'affiliation_led'|'autonomy_led'|'mixed';
  styleLabel: 'novelty_led'|'security_led'|'mixed';
}

// Weights for Pursuit (P) — aligns with hand-back JSON
const W_O = 0.40, W_E = 0.35, W_C = 0.25; // O + E + C → max 1.0 before scaling

// Shared cutlines (when a discrete bucket is needed elsewhere)
export const CUTLINE_HIGH   = 0.67;
export const CUTLINE_MEDMIN = 0.33;
export const CUTLINE_MEDMAX = 0.66;

export function computeSignals(means: DomainMeans): Signals {
  const { O, C, E, A, N } = means;

  // Primary ---------------------------------------------------------------
  const T = z(N);
  const P_raw = W_O*O + W_E*E + W_C*C;          // range 1–5*Σw = 5
  const P = clamp01(((P_raw / 5) - 0.2) / 0.8); // normalise then rescale
  const S = z(A);
  const B = clamp01( 0.8*z(A) - 0.2*z(N) );
  const D = clamp01( 0.55*z(E) + 0.45*z(C) );
  const G = clamp01( 0.7*z(N) - 0.3*z(A) );
  const R = z(C);
  const V = z(O);
  const Y = clamp01( 0.6*z(E) + 0.1*z(O) );
  const L = clamp01( 0.7*z(E) + 0.3*z(O) );
  const F = clamp01( 0.7*z(A) + 0.3*z(E) );
  const U = clamp01( 0.6*z(C) + 0.2*(1 - z(A)) );
  const M = clamp01( 0.5*z(O) + 0.5*z(C) );
  const I = clamp01( 0.6*z(A) + 0.2*z(C) - 0.2*z(N) );
  const K = clamp01( 0.6*z(E) + 0.2*(1 - z(A)) + 0.2*z(C) );
  const Q = clamp01( 0.45*z(C) + 0.35*(1 - z(O)) + 0.20*(1 - z(N)) );

  // Derived axes ----------------------------------------------------------
  const motionBalance = P - T;          // Δ = Pursuit – Threat
  const socialStance  = F - U;          // affiliation vs autonomy
  const styleAxis     = V - Q;          // novelty vs security

  // Labels ----------------------------------------------------------------
  const leadLabel: Signals['leadLabel'] = motionBalance >= 0.15 ? 'pursuit'
    : motionBalance <= -0.15 ? 'threat'
    : 'balanced';
  const affiliationLabel: Signals['affiliationLabel'] = socialStance >= 0.10 ? 'affiliation_led'
    : socialStance <= -0.10 ? 'autonomy_led'
    : 'mixed';
  const styleLabel: Signals['styleLabel'] = styleAxis >= 0.10 ? 'novelty_led'
    : styleAxis <= -0.10 ? 'security_led'
    : 'mixed';

  return {
    T, P, S, B, D, G, R, V, Y, L, F, U, M, I, K, Q,
    motionBalance, socialStance, styleAxis,
    leadLabel, affiliationLabel, styleLabel
  };
}
