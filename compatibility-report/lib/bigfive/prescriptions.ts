export const OVERRIDES = {
  BOUNDARY_PROTOCOL: { 
    id: 'Boundary Protocol', 
    why: 'Weekly retro for voice balance.' 
  },
  STRESS_RESET: { 
    id: 'Stress Reset', 
    why: 'Quick resets before decisions when tension spikes.' 
  },
};

export const ROUTINES = {
  CADENCE_CONTRACT: { 
    name: 'Cadence Contract', 
    spec: 'Short regular check-ins to prevent drift.' 
  },
  DECISION_SLA: { 
    name: 'Decision SLA', 
    spec: 'Time-boxed decisions (24–72h) to stop looping.' 
  },
};

export const SCENARIOS = {
  work: [
    { 
      risk: 'deadline slippage', 
      guardrail: 'Guard against missed deadlines and scope creep with clear ownership and logs.',
      trigger: { domain: 'C', synergy: 'Tension' } 
    },
  ],
  relationship: [
    { 
      risk: 'pace fatigue', 
      guardrail: 'Protect against pace fatigue with quiet hours and opt-in social time.',
      trigger: { domain: 'E', synergy: 'Tension' } 
    },
  ]
};
