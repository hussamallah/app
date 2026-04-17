package com.example.groundzero.compat

data class DomainProfile(
    val raw: Double,
    val pct: Int,
    val bucket: String,
)

data class GZProfile(
    val domains: Map<String, DomainProfile>,
    /** Keys like "O:Imagination", values 1–5 raw. */
    val facets: Map<String, Double>,
    val archetypeId: String,
)

data class DomainCompatEntry(
    val aRaw: Double,
    val bRaw: Double,
    val delta: Double,
    val synergy: String,
    val scorePct: Double,
)

data class FacetAlignPair(
    val facet: String,
    val a: Double,
    val b: Double,
)

data class FacetConflictPair(
    val facet: String,
    val a: Double,
    val b: Double,
)

data class FacetAnalysis(
    val alignPairs: List<FacetAlignPair>,
    val conflictPairs: List<FacetConflictPair>,
)

data class OverallCompat(
    val scorePct: Int,
    val band: String,
    val rationale: List<String>,
)

data class CompatResult(
    val overall: OverallCompat,
    val domains: Map<String, DomainCompatEntry>,
    val facets: FacetAnalysis,
)

data class OverrideItem(val id: String, val why: String)
data class RoutineItem(val name: String, val spec: String)
data class PrescriptionScenarios(val work: List<String>, val relationship: List<String>)

data class Prescriptions(
    val overrides: List<OverrideItem>,
    val routines: List<RoutineItem>,
    val scenarios: PrescriptionScenarios,
)

data class CompatibilityBundle(
    val compat: CompatResult,
    val prescriptions: Prescriptions,
    /** 2–4 sentence human-readable narrative of the overall dynamic. */
    val narrative: String,
    /** How the two archetypes tend to combine — deterministic from sorted archetype pair. */
    val archetypePairing: String,
)
