package com.example.groundzero.assessment

import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round
import kotlin.comparisons.compareBy
import kotlin.comparisons.thenBy
import kotlin.comparisons.thenByDescending

/**
 * Mirrors `@/lib/bigfive/format` `toPercentFromRaw` (linear 1–5 → 0–100).
 * Used by GZFinalAssessment `finalizeAndSave` for `A_pct` / `domain_mean_pct`.
 */
fun toPercentFromRaw(raw: Double): Double =
    ((sanitizeScore(raw) - 1.0) / 4.0 * 100.0).coerceIn(0.0, 100.0)

/** org.json rejects NaN/Infinity — prevents crashes when serializing results. */
fun sanitizeScore(x: Double): Double =
    if (x.isNaN() || x.isInfinite()) 3.0 else max(1.0, min(5.0, x))

private fun facetBucketLabel(raw: Double): String = when {
    raw >= 5.0 -> "High"
    raw <= 2.0 -> "Low"
    else -> "Medium"
}

private val bucketRank = mapOf("High" to 3, "Medium" to 2, "Low" to 1)

/**
 * Builds the same `results` array shape as [GZFinalAssessment.finalizeAndSave]:
 * one entry per domain in [domainOrder], then optional `{ domain: "ARCH", payload: { winner, trace } }`.
 */
fun buildGzFullResultsJson(
    bankVersion: String,
    domainOrder: List<String>,
    scores: Map<String, Map<String, Double>>,
    archWinner: String?,
    archTraceJson: JSONArray = JSONArray(),
): String {
    val results = JSONArray()
    for (d in domainOrder) {
        val facets = BigFiveConstants.canonicalFacets(d)
        val aRaw = LinkedHashMap<String, Double>()
        for (f in facets) {
            val key = BigFiveConstants.toCanonicalFacet(d, f)
            val v = sanitizeScore(scores[d]?.get(key) ?: 3.0)
            aRaw[f] = v
        }
        val aPct = LinkedHashMap<String, Double>()
        val bucket = LinkedHashMap<String, String>()
        for (f in facets) {
            val raw = aRaw[f]!!
            aPct[f] = toPercentFromRaw(raw)
            bucket[f] = facetBucketLabel(raw)
        }
        val order = facets.toMutableList()
        order.sortWith(
            compareBy<String> { bucketRank[bucket[it]!!]!! }
                .thenByDescending { aRaw[it]!! }
                .thenBy { facets.indexOf(it) },
        )
        val meanSum = facets.sumOf { f -> sanitizeScore(aRaw[f] ?: 3.0) }
        val domainMeanRaw = sanitizeScore(
            round((meanSum / facets.size.coerceAtLeast(1)) * 100.0) / 100.0,
        )
        val domainMeanPct = round(toPercentFromRaw(domainMeanRaw) * 10.0) / 10.0

        val phase1P = JSONObject()
        val phase1M = JSONObject()
        val phase1T = JSONObject()
        val phase1Pcap = JSONObject()
        for (f in facets) {
            phase1P.put(f, 0)
            phase1M.put(f, 0)
            phase1T.put(f, 0)
            phase1Pcap.put(f, 0)
        }
        val aRawJson = JSONObject()
        for ((k, v) in aRaw) aRawJson.put(k, v)
        val aPctJson = JSONObject()
        for ((k, v) in aPct) aPctJson.put(k, v)
        val bucketJson = JSONObject()
        for ((k, v) in bucket) bucketJson.put(k, v)
        val orderJson = JSONArray()
        for (f in order) orderJson.put(f)

        val payload = JSONObject()
        payload.put("version", bankVersion)
        payload.put("domain", d)
        payload.put(
            "phase1",
            JSONObject().apply {
                put("p", phase1P)
                put("m", phase1M)
                put("t", phase1T)
                put("P", phase1Pcap)
            },
        )
        payload.put(
            "phase2",
            JSONObject().apply {
                put("answers", JSONArray())
                put("A_raw", aRawJson)
            },
        )
        payload.put("phase3", JSONObject().put("asked", JSONArray()))
        payload.put(
            "final",
            JSONObject().apply {
                put("A_pct", aPctJson)
                put("bucket", bucketJson)
                put("order", orderJson)
                put("domain_mean_raw", domainMeanRaw)
                put("domain_mean_pct", domainMeanPct)
            },
        )
        payload.put("audit", JSONObject().put("personalization", JSONObject.NULL))

        results.put(JSONObject().put("domain", d).put("payload", payload))
    }
    if (!archWinner.isNullOrBlank()) {
        results.put(
            JSONObject().put("domain", "ARCH").put(
                "payload",
                JSONObject().put("winner", archWinner).put("trace", archTraceJson),
            ),
        )
    }
    return results.toString()
}

fun domainMeanFromScores(scores: Map<String, Map<String, Double>>, domain: String): Double {
    val facets = BigFiveConstants.canonicalFacets(domain)
    if (facets.isEmpty()) return 3.0
    val vals = facets.map { f ->
        val key = BigFiveConstants.toCanonicalFacet(domain, f)
        sanitizeScore(scores[domain]?.get(key) ?: 3.0)
    }
    return vals.sum() / vals.size
}

/** Same formula as `app content/results/page.tsx` CircuitsPreview Authority circuit. */
fun authorityCircuitPercent(scores: Map<String, Map<String, Double>>): Int {
    val c = domainMeanFromScores(scores, "C")
    val e = domainMeanFromScores(scores, "E")
    val authorityValue = ((c - 3.0) / 2.0 + (e - 3.0) / 2.0) / 2.0
    return round(((authorityValue + 1.0) / 2.0) * 100.0).toInt().coerceIn(0, 100)
}

