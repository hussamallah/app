package com.example.groundzero.results

import android.content.res.AssetManager
import com.example.groundzero.assessment.BigFiveConstants
import com.example.groundzero.assessment.sanitizeScore
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Mirrors `lib/bigfive/fiveCardSelector.ts`: z-scores, catalog trait pairs, H/M/L thresholds,
 * strict H pass + relaxed M pass, merge capped at 4, catalog-index dedupe, Pursuit×Threat fallback.
 */
data class TensionCard(
    val title: String,
    val explanation: String,
    val friction: String,
    val howBothTrue: String,
    /** Catalog row index for dedupe; -1 = Pursuit×Threat fallback. */
    val catalogIndex: Int,
    val leftPct: Int?,
    val rightPct: Int?,
    val leftTrait: String?,
    val rightTrait: String?,
)

private fun z(x: Double): Double {
    val s = sanitizeScore(x)
    return max(0.0, min(1.0, (s - 1.0) / 4.0))
}

private fun facetBucket(raw: Double): String = when {
    sanitizeScore(raw) >= 5.0 -> "High"
    sanitizeScore(raw) <= 2.0 -> "Low"
    else -> "Medium"
}

private data class FacetData(
    val domain: String,
    val facet: String,
    val raw: Double,
    val bucket: String,
)

private data class CatalogSide(val trait: String, val pol: String, val thr: Char)

private data class ConflictCopy(
    val title: String,
    val explanation: String,
    val friction: String,
    val howCanBoth: String,
)

private data class CatalogEntry(
    val catalogId: String,
    val a: CatalogSide,
    val b: CatalogSide,
    val copy: ConflictCopy?,
)

private data class ConflictSel(
    val idx: Int,
    val entry: CatalogEntry,
    val score: Double,
    val aVal: Double,
    val bVal: Double,
)

private const val H_BAR = 0.60
private const val M_BAR = 0.50
private const val L_BAR = 0.40

private fun thrBar(thr: Char): Double = when (thr) {
    'H' -> H_BAR
    'M' -> M_BAR
    'L' -> L_BAR
    else -> M_BAR
}

private fun passThreshold(valZ: Double, pol: String, thr: Char): Double {
    val t = thrBar(thr)
    val s = if (pol == "up") valZ else (1.0 - valZ)
    return if (s >= t) s else -1.0
}

private val domainNameToKey: Map<String, String> = mapOf(
    "openness" to "O",
    "conscientiousness" to "C",
    "extraversion" to "E",
    "agreeableness" to "A",
    "neuroticism" to "N",
)

private fun domainMeans(facets: List<FacetData>): Map<String, Double> {
    val keys = listOf("O", "C", "E", "A", "N")
    val by = mutableMapOf<String, MutableList<Double>>()
    for (d in keys) by[d] = mutableListOf()
    for (f in facets) {
        by.getOrPut(f.domain) { mutableListOf() }.add(f.raw)
    }
    return keys.associateWith { d ->
        val arr = by[d].orEmpty()
        if (arr.isEmpty()) 3.0 else arr.sum() / arr.size
    }
}

private fun traitZ(trait: String, facets: List<FacetData>, zMap: Map<String, Double>): Double? {
    val domainKey = domainNameToKey[trait.lowercase()]
    if (domainKey != null) {
        val mean = domainMeans(facets)[domainKey] ?: 3.0
        return z(mean)
    }
    val hit = facets.find { it.facet.lowercase() == trait.lowercase() } ?: return null
    val k = "${hit.domain}:${hit.facet}"
    return zMap[k] ?: z(hit.raw)
}

private fun effectiveThr(minTier: Char, entryThr: Char): Char =
    if (minTier == 'M' && entryThr == 'H') 'M' else entryThr

private fun evalTier(
    catalog: List<CatalogEntry>,
    facets: List<FacetData>,
    zMap: Map<String, Double>,
    minTier: Char,
    maxConflicts: Int,
): List<ConflictSel> {
    val conflicts = mutableListOf<ConflictSel>()
    catalog.forEachIndexed { idx, entry ->
        val aVal = traitZ(entry.a.trait, facets, zMap) ?: return@forEachIndexed
        val bVal = traitZ(entry.b.trait, facets, zMap) ?: return@forEachIndexed
        val aThr = effectiveThr(minTier, entry.a.thr)
        val bThr = effectiveThr(minTier, entry.b.thr)
        val aScore = passThreshold(aVal, entry.a.pol, aThr)
        val bScore = passThreshold(bVal, entry.b.pol, bThr)
        if (aScore < 0 || bScore < 0) return@forEachIndexed
        val score = minOf(aScore, bScore)
        conflicts.add(ConflictSel(idx, entry, score, aVal, bVal))
    }
    return conflicts.sortedByDescending { it.score }.take(maxConflicts)
}

private fun selectConflictPairsDetailed(
    catalog: List<CatalogEntry>,
    facets: List<FacetData>,
    zMap: Map<String, Double>,
    maxConflicts: Int,
): List<ConflictSel> {
    val hConflicts = evalTier(catalog, facets, zMap, 'H', maxConflicts)
    val mConflicts = evalTier(catalog, facets, zMap, 'M', maxConflicts)
    return (hConflicts + mConflicts).take(maxConflicts)
}

private val defaultCopy = ConflictCopy(
    title = "Conflict",
    explanation = "Gas pedal meets brake.",
    friction = "This tension helps you with fast probes and crisis work but can hurt you during long periods of ambiguity.",
    howCanBoth = "Tip: pause 2 counts; set a binary next step.",
)

private fun strengthLabel(v: Double): String = when {
    v >= 0.7 -> "Strong"
    v >= 0.4 -> "Moderate"
    else -> "Slight"
}

private fun pursuitThreatFallback(facets: List<FacetData>): TensionCard {
    val means = domainMeans(facets)
    val o = means["O"] ?: 3.0
    val c = means["C"] ?: 3.0
    val e = means["E"] ?: 3.0
    val n = means["N"] ?: 3.0
    val t = z(n)
    val p = z(0.40 * o + 0.35 * e + 0.25 * c)
    val pLabel = if (p >= 0.5) "High" else "Low"
    val tLabel = if (t >= 0.5) "High" else "Low"
    val pStrength = strengthLabel(if (pLabel == "High") p else (1.0 - p))
    val tStrength = strengthLabel(if (tLabel == "High") t else (1.0 - t))
    val title = "Conflict Pair — Pursuit $pLabel ($pStrength) × Threat $tLabel ($tStrength)"
    return TensionCard(
        title = title,
        explanation = "Gas pedal meets brake.",
        friction = "This tension helps you with fast probes and crisis work but can hurt you during long periods of ambiguity.",
        howBothTrue = "Tip: pause 2 counts; set a binary next step.",
        catalogIndex = -1,
        leftPct = (p * 100).roundToInt(),
        rightPct = (t * 100).roundToInt(),
        leftTrait = "Pursuit",
        rightTrait = "Threat",
    )
}

private fun buildConflictCards(
    catalog: List<CatalogEntry>,
    facets: List<FacetData>,
    zMap: Map<String, Double>,
    maxConflicts: Int,
): List<TensionCard> {
    val conflicts = selectConflictPairsDetailed(catalog, facets, zMap, maxConflicts)
    val cards = mutableListOf<TensionCard>()
    for (sel in conflicts) {
        val entry = sel.entry
        val copy = entry.copy ?: defaultCopy
        val aPct = (sel.aVal * 100).roundToInt()
        val bPct = (sel.bVal * 100).roundToInt()
        cards.add(
            TensionCard(
                title = copy.title,
                explanation = copy.explanation,
                friction = copy.friction,
                howBothTrue = copy.howCanBoth,
                catalogIndex = sel.idx,
                leftPct = aPct,
                rightPct = bPct,
                leftTrait = entry.a.trait,
                rightTrait = entry.b.trait,
            ),
        )
    }
    if (cards.isEmpty()) {
        cards.add(pursuitThreatFallback(facets))
    }
    val seen = mutableSetOf<Int>()
    val unique = mutableListOf<TensionCard>()
    for (c in cards) {
        if (c.catalogIndex == -1 || !seen.contains(c.catalogIndex)) {
            unique.add(c)
            if (c.catalogIndex != -1) seen.add(c.catalogIndex)
        }
    }
    return unique
}

private fun parseSide(o: JSONObject): CatalogSide = CatalogSide(
    trait = o.getString("trait"),
    pol = o.getString("pol"),
    thr = o.getString("thr").firstOrNull() ?: 'H',
)

private fun loadConflictCatalog(assets: AssetManager): List<CatalogEntry> = runCatching {
    assets.open("conflict_catalog.json").bufferedReader().use { reader ->
        val arr = JSONArray(reader.readText())
        buildList {
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                val copyObj = o.optJSONObject("copy")
                val copy = if (copyObj != null) {
                    ConflictCopy(
                        title = copyObj.getString("title"),
                        explanation = copyObj.getString("explanation"),
                        friction = copyObj.getString("friction"),
                        howCanBoth = copyObj.getString("how_can_both_be_true"),
                    )
                } else {
                    null
                }
                add(
                    CatalogEntry(
                        catalogId = o.getString("id"),
                        a = parseSide(o.getJSONObject("a")),
                        b = parseSide(o.getJSONObject("b")),
                        copy = copy,
                    ),
                )
            }
        }
    }
}.getOrElse { emptyList() }

private fun buildFacetDataList(
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
): List<FacetData> = buildList {
    for (d in domainOrder) {
        for (f in BigFiveConstants.canonicalFacets(d)) {
            val key = BigFiveConstants.toCanonicalFacet(d, f)
            val raw = sanitizeScore(scores[d]?.get(key) ?: 3.0)
            add(FacetData(domain = d, facet = f, raw = raw, bucket = facetBucket(raw)))
        }
    }
}

fun buildTensionCards(
    assets: AssetManager,
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
): List<TensionCard> {
    val facets = buildFacetDataList(domainOrder, scores)
    val zMap = facets.associate { "${it.domain}:${it.facet}" to z(it.raw) }
    val catalog = loadConflictCatalog(assets)
    if (catalog.isEmpty()) {
        return listOf(pursuitThreatFallback(facets))
    }
    return buildConflictCards(catalog, facets, zMap, maxConflicts = 4)
}
