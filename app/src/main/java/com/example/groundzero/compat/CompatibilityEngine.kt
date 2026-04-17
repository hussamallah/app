package com.example.groundzero.compat

import com.example.groundzero.assessment.ArchetypeCatalog
import com.example.groundzero.assessment.BigFiveConstants
import com.example.groundzero.assessment.domainMeanFromScores
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

// ─── Scoring constants (mirrors compatibility_config.ts) ──────────────────────
private val DOMAIN_WEIGHTS = mapOf("O" to 1.0, "C" to 1.2, "E" to 1.2, "A" to 1.4, "N" to 1.2)

private const val SYNERGY_ALIGN = 0.4
private const val SYNERGY_COMPLEMENT = 1.2
private const val BAND_STRONG = 80
private const val BAND_MODERATE = 60

// ─── Overrides (mirrors prescriptions.ts + expanded) ──────────────────────────
private val OV_BOUNDARY = OverrideItem(
    id = "Boundary Protocol",
    why = "Run a short weekly check-in where each person names one thing they needed more space on and one thing they appreciated — keeps voice balance before imbalance accumulates.",
)
private val OV_STRESS = OverrideItem(
    id = "Stress Reset",
    why = "Agree on a physical signal (e.g. a phrase or hand gesture) that pauses a charged conversation for 10 minutes. Decide while calm, not mid-escalation.",
)
private val OV_NOVELTY = OverrideItem(
    id = "Novelty Dial",
    why = "Alternate who chooses the plan: the higher-Openness person picks one month, the lower-Openness person the next. Respects both needs without constant negotiation.",
)
private val OV_TRUST_VERIFY = OverrideItem(
    id = "Trust-Verify Pact",
    why = "When one person is skeptical and the other is trusting, agree upfront on which decisions require joint sign-off vs. independent action to avoid feeling surveilled or naive.",
)
private val OV_CONFLICT_PROTOCOL = OverrideItem(
    id = "Conflict Protocol",
    why = "High-A vs low-A pairs need a named escalation path: (1) flag it, (2) 24 h pause, (3) structured discussion. Avoids silent resentment from the accommodator and blindsiding the assertive partner.",
)
private val OV_ENERGY_CONTRACT = OverrideItem(
    id = "Energy Contract",
    why = "Write down your social battery needs once (e.g. '2 evenings in per week'). Review monthly. Eliminates the recurring negotiation that exhausts both sides.",
)
private val OV_EMOTION_BRIDGE = OverrideItem(
    id = "Emotion Bridge",
    why = "When one partner shuts down and the other escalates, use a 3-step bridge: name the feeling, state the need, ask the same of the other. Practiced when calm so it works under stress.",
)

// ─── Routines ─────────────────────────────────────────────────────────────────
private val RT_CADENCE = RoutineItem(
    name = "Cadence Contract",
    spec = "15-minute weekly sync — progress, blockers, what each person needs. Non-negotiable slot. Prevents misalignment from compounding.",
)
private val RT_SLA = RoutineItem(
    name = "Decision SLA",
    spec = "Any unresolved decision gets a 48-hour window. If no agreement, the person with higher stake decides and documents the reasoning. Stops loops.",
)
private val RT_ASYNC = RoutineItem(
    name = "Async-First Rule",
    spec = "Default to written updates before live discussion. Favours the lower-extraversion partner and produces clearer thinking from the higher-extraversion partner.",
)
private val RT_RECHARGE = RoutineItem(
    name = "Recharge Calendar",
    spec = "Block 'solo recharge' time on a shared calendar so the introverted partner isn't over-scheduled and the extraverted partner doesn't book over it inadvertently.",
)
private val RT_PLAN_SWAP = RoutineItem(
    name = "Plan-Swap Month",
    spec = "Alternate who sets the agenda each month. The structured partner gets predictability half the time; the spontaneous partner gets freedom the other half.",
)
private val RT_CREATIVE_BLOCK = RoutineItem(
    name = "Creative Block",
    spec = "Dedicate one recurring slot to exploration with no output goal — a museum, a podcast, a question. Satisfies the high-Openness partner without requiring the lower-Openness partner to live in novelty.",
)

// ─── Scenarios ────────────────────────────────────────────────────────────────
private val SC_DEADLINE = "Guard against missed deadlines and scope creep with clear ownership logs. The structured partner leads execution; the flexible partner handles pivots."
private val SC_PACE = "Protect against pace fatigue by agreeing on a weekly social quota. The extraverted partner gets enough stimulation; the introverted partner avoids burnout."
private val SC_MONEY = "Money decisions are a Conscientiousness flashpoint. Agree on a shared budget baseline with individual discretionary amounts — avoids both rigidity and irresponsibility."
private val SC_CONFLICT = "When Agreeableness gaps show up in conflict, the accommodating partner may say yes and resent it. Agree that 'let me think about it' is always a valid answer."
private val SC_STRESS = "During high-stress periods the high-Neuroticism partner needs space to process verbally; the low-Neuroticism partner needs to resist dismissing the concern. Pre-agree on what 'I need to vent' means vs. 'I need advice'."
private val SC_CHANGE = "Change and novelty hit differently: the high-Openness partner sees opportunity, the low-Openness partner sees risk. Before any major change, run a 'what stays the same' audit together."
private val SC_TRUST = "Trust gaps surface under pressure. If one partner is skeptical about a third party (colleague, friend), name it early rather than letting it simmer."

// ─── Profile builder ──────────────────────────────────────────────────────────
fun buildGZProfile(archetypeId: String, scores: Map<String, Map<String, Double>>): GZProfile {
    val domainKeys = listOf("O", "C", "E", "A", "N")
    val domains = linkedMapOf<String, DomainProfile>()
    for (d in domainKeys) {
        val raw = domainMeanFromScores(scores, d)
        val pct = round(((raw - 1.0) / 4.0) * 100).toInt().coerceIn(0, 100)
        val bucket = when {
            pct >= 67 -> "High"
            pct <= 33 -> "Low"
            else -> "Med"
        }
        domains[d] = DomainProfile(raw = raw, pct = pct, bucket = bucket)
    }
    val facets = linkedMapOf<String, Double>()
    for (d in domainKeys) {
        for (f in BigFiveConstants.canonicalFacets(d)) {
            val storeKey = BigFiveConstants.toCanonicalFacet(d, f)
            val v = scores[d]?.get(storeKey) ?: 3.0
            facets["$d:$f"] = v
        }
    }
    return GZProfile(domains = domains, facets = facets, archetypeId = archetypeId)
}

// ─── Scoring functions (1:1 with compatibility.ts) ───────────────────────────
fun calculateDomainCompatScore(aRaw: Double, bRaw: Double): Double {
    val score = 100.0 - (abs(aRaw - bRaw) / 4.0) * 100.0
    return max(0.0, min(100.0, score))
}

fun getSynergyLabel(delta: Double, domain: String): String {
    val absDelta = abs(delta)
    if (domain == "N" && absDelta >= 0.8 && absDelta <= 1.2) return "Watch"
    if (absDelta <= SYNERGY_ALIGN) return "Align"
    if (absDelta <= SYNERGY_COMPLEMENT) return "Complement"
    return "Tension"
}

// ─── Facet analysis ───────────────────────────────────────────────────────────
private fun analyzeFacetPairs(a: GZProfile, b: GZProfile): FacetAnalysis {
    val highThreshold = 4.0
    val lowThreshold = 2.0
    val alignPairs = mutableListOf<FacetAlignPair>()
    val conflictPairs = mutableListOf<FacetConflictPair>()
    val keys = (a.facets.keys + b.facets.keys).distinct()
    for (facetKey in keys) {
        val aScore = a.facets[facetKey] ?: continue
        val bScore = b.facets[facetKey] ?: continue
        val aHigh = aScore >= highThreshold
        val bHigh = bScore >= highThreshold
        val aLow = aScore <= lowThreshold
        val bLow = bScore <= lowThreshold
        if ((aHigh && bHigh) || (aLow && bLow)) {
            alignPairs.add(FacetAlignPair(facet = facetKey, a = aScore, b = bScore))
        } else if ((aHigh && bLow) || (aLow && bHigh)) {
            conflictPairs.add(FacetConflictPair(facet = facetKey, a = aScore, b = bScore))
        }
    }
    // Sort: conflicts by gap magnitude descending (largest gap = most impactful); aligns by min score descending (strongest shared extremes first)
    val sortedConflict = conflictPairs.sortedByDescending { abs(it.a - it.b) }
    val sortedAlign = alignPairs.sortedByDescending { minOf(it.a, it.b) }
    return FacetAnalysis(alignPairs = sortedAlign, conflictPairs = sortedConflict)
}

// ─── Overall score ────────────────────────────────────────────────────────────
private fun calculateOverallScore(domainEntries: Map<String, DomainCompatEntry>): Pair<Int, String> {
    var weightedSum = 0.0
    var totalWeight = 0.0
    for ((domain, e) in domainEntries) {
        val w = DOMAIN_WEIGHTS[domain] ?: 1.0
        weightedSum += e.scorePct * w
        totalWeight += w
    }
    val score = round(weightedSum / totalWeight).toInt()
    val band = when {
        score >= BAND_STRONG -> "Strong"
        score >= BAND_MODERATE -> "Moderate"
        else -> "Caution"
    }
    return score to band
}

// ─── Rationale: top 2 alignments + top tension/watch ─────────────────────────
private fun buildRationale(domainEntries: Map<String, DomainCompatEntry>): List<String> {
    val rationale = mutableListOf<String>()
    val sorted = domainEntries.entries.sortedByDescending { it.value.scorePct }
    val alignments = sorted.filter { it.value.synergy in listOf("Align", "Complement") }.take(2)
    for (item in alignments) {
        when (item.value.synergy) {
            "Align" -> rationale.add("High ${BigFiveConstants.DOMAIN_LABELS[item.key] ?: item.key} alignment")
            "Complement" -> rationale.add("Complementary ${BigFiveConstants.DOMAIN_LABELS[item.key] ?: item.key}")
        }
    }
    val topTension = sorted.lastOrNull { it.value.synergy == "Tension" }
    val topWatch = sorted.firstOrNull { it.value.synergy == "Watch" }
    if (topTension != null) {
        rationale.add("Manage ${BigFiveConstants.DOMAIN_LABELS[topTension.key] ?: topTension.key} mismatch")
    } else if (topWatch != null) {
        rationale.add("Watch ${BigFiveConstants.DOMAIN_LABELS[topWatch.key] ?: topWatch.key} reactivity gap")
    }
    return rationale
}

// ─── Narrative ───────────────────────────────────────────────────────────────
private fun buildNarrative(compat: CompatResult): String {
    val overall = compat.overall
    val domains = compat.domains

    val strongest = domains.entries.maxByOrNull { it.value.scorePct }
    val strongestLabel = BigFiveConstants.DOMAIN_LABELS[strongest?.key] ?: "core traits"

    val topTension = domains.entries.filter { it.value.synergy == "Tension" }.minByOrNull { it.value.scorePct }
    val topTensionLabel = BigFiveConstants.DOMAIN_LABELS[topTension?.key]
    val watchDomain = domains.entries.find { it.value.synergy == "Watch" }

    val intro = when (overall.band) {
        "Strong" ->
            "Your profiles show a strong natural alignment — ${overall.scorePct}% overall — with the deepest bond rooted in shared $strongestLabel."
        "Moderate" ->
            "Your profiles show moderate compatibility at ${overall.scorePct}%, with meaningful common ground in $strongestLabel and clear room to grow through intentional communication."
        else ->
            "Your profiles show ${overall.scorePct}% overall compatibility. Real differences exist, and — named and managed — they can become complementary rather than corrosive."
    }

    val tensionLine = when {
        topTensionLabel != null ->
            " The primary friction zone is $topTensionLabel — your instincts here pull in opposite directions, and that gap is where the most deliberate investment lives."
        watchDomain != null -> {
            val wl = BigFiveConstants.DOMAIN_LABELS[watchDomain.key] ?: "emotional reactivity"
            " Watch the $wl axis: the gap is small enough to bridge but wide enough to amplify under stress."
        }
        else ->
            " With no major tension domains, your primary work is sustaining depth rather than managing conflict."
    }

    val facetLine = if (compat.facets.conflictPairs.isNotEmpty()) {
        val topConflict = compat.facets.conflictPairs.first()
        val facetName = topConflict.facet.substringAfter(":").lowercase()
        " At the trait level, $facetName shows the starkest contrast — one of you scores strongly high, the other strongly low — and this single gap shapes your day-to-day interaction patterns most visibly."
    } else {
        " At the trait level, no stark opposites were found; you operate from similar intensities across the board."
    }

    return intro + tensionLine + facetLine
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
private fun generatePrescriptions(compat: CompatResult): Prescriptions {
    val overrides = linkedSetOf<OverrideItem>()
    val routines = linkedSetOf<RoutineItem>()
    val work = linkedSetOf<String>()
    val rel = linkedSetOf<String>()
    val d = compat.domains

    // Extraversion
    if (d["E"]?.synergy == "Tension") {
        overrides.add(OV_ENERGY_CONTRACT)
        routines.add(RT_RECHARGE)
        routines.add(RT_ASYNC)
        rel.add(SC_PACE)
    }
    // Neuroticism
    val n = d["N"]?.synergy
    if (n == "Tension" || n == "Watch") {
        overrides.add(OV_STRESS)
        overrides.add(OV_EMOTION_BRIDGE)
        rel.add(SC_STRESS)
    }
    // Conscientiousness
    if (d["C"]?.synergy == "Tension") {
        routines.add(RT_CADENCE)
        routines.add(RT_SLA)
        routines.add(RT_PLAN_SWAP)
        work.add(SC_DEADLINE)
        work.add(SC_MONEY)
    }
    // Agreeableness
    if (d["A"]?.synergy == "Tension") {
        overrides.add(OV_CONFLICT_PROTOCOL)
        rel.add(SC_CONFLICT)
        rel.add(SC_TRUST)
    }
    // Openness
    if (d["O"]?.synergy == "Tension") {
        overrides.add(OV_NOVELTY)
        routines.add(RT_CREATIVE_BLOCK)
        rel.add(SC_CHANGE)
    }

    // Facet-level triggers
    val conflicts = compat.facets.conflictPairs
    if (conflicts.any { it.facet.endsWith(":Modesty") }) overrides.add(OV_CONFLICT_PROTOCOL)
    if (conflicts.any { it.facet.endsWith(":Trust") }) overrides.add(OV_TRUST_VERIFY)
    if (conflicts.any { it.facet.endsWith(":Cooperation") }) routines.add(RT_SLA)
    if (conflicts.any { it.facet.endsWith(":Assertiveness") }) overrides.add(OV_BOUNDARY)
    if (conflicts.any { it.facet.endsWith(":Anxiety") || it.facet.endsWith(":Vulnerability") }) {
        overrides.add(OV_EMOTION_BRIDGE)
        rel.add(SC_STRESS)
    }

    return Prescriptions(
        overrides = overrides.toList(),
        routines = routines.toList(),
        scenarios = PrescriptionScenarios(work = work.toList(), relationship = rel.toList()),
    )
}

// ─── Archetype pairing (canonical blurbs; keys sorted idA|idB) ──────────────────
private val ARCHETYPE_PAIRS: Map<String, String> = mapOf(
    "architect|catalyst" to
        "Architect builds the frame; Catalyst breaks stillness and forces motion. Powerful when Catalyst feeds raw energy into Architect's plan — friction when both try to own timing.",
    "architect|diplomat" to
        "Architect drafts structure; Diplomat smooths the human seams. Decisions stick when Architect invites consultation and Diplomat names hard trade-offs.",
    "architect|rebel" to
        "Rebel breaks the pattern; Architect builds the new one. Powerful when sequenced — friction when both act at once.",
    "architect|visionary" to
        "Visionary pulls toward the far horizon; Architect engineers the path. Best when Visionary holds the why and Architect owns the how — clash when either dismisses the other's layer.",
    "architect|guardian" to
        "Guardian shields the formation; Architect reinforces the scaffolding. Strong on reliability — watch for over-control when both default to protection.",
    "architect|sovereign" to
        "Sovereign drives pace and authority; Architect systematises execution. Fast alignment when roles are explicit — tension when two command styles compete.",
    "catalyst|diplomat" to
        "Catalyst sparks motion; Diplomat calms turbulence. The pairing works when speed includes consent — risk when spark reads as chaos to the smoother.",
    "catalyst|vessel" to
        "Catalyst ignites; Vessel refines tempo. Complementary when Vessel channels heat into craft — friction when pace feels reckless versus stifling.",
    "catalyst|rebel" to
        "Two disruptors — high voltage. Thrilling for innovation; exhausting if neither owns cleanup or follow-through.",
    "diplomat|rebel" to
        "Rebel challenges consensus; Diplomat preserves connection. Healthy when Rebel names what Diplomat avoids — corrosive if Rebel equates harmony with weakness.",
    "diplomat|sovereign" to
        "Sovereign brings decisive authority; Diplomat brings consensus and care. Decisions can happen fast — if Sovereign learns to consult, and Diplomat learns to say no.",
    "diplomat|partner" to
        "Partner stabilises the lane; Diplomat tends the emotional air. Warm and loyal — define boundaries so neither over-merges.",
    "guardian|rebel" to
        "Guardian holds the line; Rebel tests every fence. Protective chemistry — stalemate if Guardian reads every probe as threat.",
    "guardian|sentinel" to
        "Sentinel watches the edge; Guardian shields the flock. Double vigilance — excellent for risk-heavy contexts; add lightness so vigilance doesn't become suspicion.",
    "navigator|seeker" to
        "Navigator adjusts course in real time; Seeker drills toward truth. Strong for complex problems — align on when to optimise versus when to interrogate.",
    "navigator|visionary" to
        "Navigator steers through change; Visionary sets the distant star. Powerful when Visionary trusts Navigator's course corrections.",
    "partner|provider" to
        "Partner keeps wing-to-wing loyalty; Provider lifts the load. Deep mutual care — watch for silent over-giving and unspoken scorekeeping.",
    "partner|sovereign" to
        "Sovereign leads outward; Partner stabilises inward. Clear roles shine — conflict if Sovereign's pace feels like neglect to Partner.",
    "rebel|sovereign" to
        "Rebel resists hierarchy; Sovereign embodies it. Magnetic tension — sustainable with explicit autonomy zones for Rebel and clear domains for Sovereign.",
    "rebel|visionary" to
        "Both refuse the default — Rebel breaks, Visionary invents. Electric for change; add one grounded voice for maintenance.",
    "seeker|visionary" to
        "Seeker uncovers what is hidden; Visionary imagines what is not yet. Synergy in innovation — slow down for implementation details.",
    "sentinel|spotlight" to
        "Sentinel holds the perimeter; Spotlight pulls the centre. Balance of safety and visibility — friction if Spotlight reads Sentinel as cagey.",
    "spotlight|vessel" to
        "Spotlight energises the room; Vessel polishes delivery. Charisma plus grace — watch for competition for narrative versus presence.",
    "architect|navigator" to
        "Navigator adapts live; Architect locks structure. Great for complex projects when Navigator owns pivots and Architect owns specs.",
    "catalyst|spotlight" to
        "Two amplifiers — energy multiplies. Fun and mobilising; add rest contracts so intensity doesn't become burnout.",
    "diplomat|seeker" to
        "Seeker probes uncomfortable truths; Diplomat softens edges. Insightful when Seeker trusts Diplomat's care — risky if truth feels buried.",
    "guardian|partner" to
        "Double loyalty — protective and bonded. Exceptional cohesion; name independence needs so protection doesn't feel like surveillance.",
    "provider|sentinel" to
        "Provider carries weight; Sentinel watches threats. Strong in crisis — both may forget to rest; schedule recovery explicitly.",
    "rebel|sentinel" to
        "Rebel tests every rule; Sentinel enforces the watch. Productive tension for ethics — toxic if framed as betrayal versus duty.",
    "sovereign|visionary" to
        "Visionary supplies direction; Sovereign supplies drive. High ceiling when aligned — power struggle if both claim the crown.",
)

private fun buildArchetypePairing(a: GZProfile, b: GZProfile): String {
    val sorted = listOf(a.archetypeId.lowercase(), b.archetypeId.lowercase()).sorted()
    val key = "${sorted[0]}|${sorted[1]}"
    return ARCHETYPE_PAIRS[key] ?: run {
        val t0 = ArchetypeCatalog.get(sorted[0]).title
        val t1 = ArchetypeCatalog.get(sorted[1]).title
        "$t0 and $t1 bring different instincts into the same relationship. Name the gap early — when each leads with their default move, the other may read it as pressure or withdrawal. Intention beats assumption."
    }
}

// ─── Main entry ───────────────────────────────────────────────────────────────
fun computeCompatibility(a: GZProfile, b: GZProfile): CompatibilityBundle {
    val domainOrder = listOf("O", "C", "E", "A", "N")
    val domainEntries = linkedMapOf<String, DomainCompatEntry>()
    for (domain in domainOrder) {
        val aD = a.domains[domain] ?: continue
        val bD = b.domains[domain] ?: continue
        val delta = bD.raw - aD.raw
        domainEntries[domain] = DomainCompatEntry(
            aRaw = aD.raw,
            bRaw = bD.raw,
            delta = delta,
            synergy = getSynergyLabel(delta, domain),
            scorePct = calculateDomainCompatScore(aD.raw, bD.raw),
        )
    }
    val (overallScore, band) = calculateOverallScore(domainEntries)
    val rationale = buildRationale(domainEntries)
    val facetAnalysis = analyzeFacetPairs(a, b)
    val compat = CompatResult(
        overall = OverallCompat(scorePct = overallScore, band = band, rationale = rationale),
        domains = domainEntries,
        facets = facetAnalysis,
    )
    return CompatibilityBundle(
        compat = compat,
        prescriptions = generatePrescriptions(compat),
        narrative = buildNarrative(compat),
        archetypePairing = buildArchetypePairing(a, b),
    )
}
