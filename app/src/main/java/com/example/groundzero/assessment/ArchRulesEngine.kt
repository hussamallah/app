package com.example.groundzero.assessment

import org.json.JSONObject
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.round

enum class MeanBucket {
    High,
    Medium,
    Low,
}

data class DomainState(
    val mean: Double,
    val bucket: MeanBucket,
    val facet: Map<String, MeanBucket>,
)

typealias ScoreMap = Map<String, Map<String, Double>>

object ArchRulesEngine {

    private val TARGET_VALS = mapOf(MeanBucket.High to 5.0, MeanBucket.Medium to 3.0, MeanBucket.Low to 1.0)

    fun facetToBucket(v: Double): MeanBucket = when {
        v >= 4.0 -> MeanBucket.High
        v <= 2.0 -> MeanBucket.Low
        else -> MeanBucket.Medium
    }

    fun meanBucket(mean: Double): MeanBucket = when {
        mean >= 3.75 -> MeanBucket.High
        mean <= 2.25 -> MeanBucket.Low
        else -> MeanBucket.Medium
    }

    fun buildDomains(finalScores: ScoreMap): Map<String, DomainState> {
        val out = linkedMapOf<String, DomainState>()
        for (d in BigFiveConstants.DOMAIN_ORDER) {
            val facs = BigFiveConstants.canonicalFacets(d)
            val raw = facs.map { f ->
                val key = BigFiveConstants.toCanonicalFacet(d, f)
                val v = finalScores[d]?.get(key) ?: 3.0
                max(1.0, min(5.0, v))
            }
            val mean = round((raw.sum() / raw.size) * 100.0) / 100.0
            val facetBuckets = facs.mapIndexed { i, f -> f to facetToBucket(raw[i]) }.toMap()
            val mb = meanBucket(mean)
            out[d] = DomainState(mean = mean, bucket = mb, facet = facetBuckets)
        }
        return out
    }

    fun passFacetCluster(d: String, cluster: JSONObject?, domains: Map<String, DomainState>): Boolean {
        if (cluster == null) return true
        val req = cluster.optJSONArray("require")
        if (req != null && req.length() > 0) {
            for (i in 0 until req.length()) {
                val r = req.getJSONObject(i)
                val facet = r.getString("facet")
                val want = r.getString("bucket")
                val b = domains[d]?.facet?.get(facet) ?: return false
                if (b.name != want) return false
            }
            return true
        }
        val minHigh = cluster.optInt("min_high", -1)
        val facetsArr = cluster.optJSONArray("facets")
        if (minHigh >= 0 && facetsArr != null) {
            var c = 0
            for (i in 0 until facetsArr.length()) {
                val f = facetsArr.getString(i)
                if (domains[d]?.facet?.get(f) == MeanBucket.High) c++
            }
            return c >= minHigh
        }
        val anyHigh = cluster.optJSONArray("any_high")
        if (anyHigh != null && anyHigh.length() > 0) {
            for (i in 0 until anyHigh.length()) {
                val f = anyHigh.getString(i)
                if (domains[d]?.facet?.get(f) == MeanBucket.High) return true
            }
            return false
        }
        val anyLow = cluster.optJSONArray("any_low")
        if (anyLow != null && anyLow.length() > 0) {
            for (i in 0 until anyLow.length()) {
                val f = anyLow.getString(i)
                if (domains[d]?.facet?.get(f) == MeanBucket.Low) return true
            }
            return false
        }
        return true
    }

    fun matchesRules(ar: ArchRuleArchetype, domains: Map<String, DomainState>): Boolean {
        val rules = ar.rules
        val domReq = rules.optJSONObject("domains") ?: return true
        for (key in domReq.keys()) {
            val want = domReq.getString(key)
            val b = domains[key]?.bucket ?: return false
            if (b.name != want) return false
        }
        val clusters = rules.optJSONObject("facet_clusters") ?: return true
        for (key in clusters.keys()) {
            val cluster = clusters.getJSONObject(key)
            if (!passFacetCluster(key, cluster, domains)) return false
        }
        return true
    }

    fun getDistance(archId: String, userDomains: Map<String, DomainState>, allRules: List<ArchRuleArchetype>): Double {
        val rules = allRules.find { it.id == archId }?.rules?.optJSONObject("domains")
        var total = 0.0
        for (d in listOf("O", "C", "E", "A", "N")) {
            val userVal = userDomains[d]?.mean ?: 3.0
            val ruleBucketStr = rules?.optString(d, "") ?: ""
            val targetVal = if (ruleBucketStr.isBlank()) {
                3.0
            } else {
                val bucket = MeanBucket.valueOf(ruleBucketStr)
                TARGET_VALS[bucket] ?: 3.0
            }
            total += abs(userVal - targetVal)
        }
        return total
    }

    /**
     * Same selection order as GZFinalAssessment: strict filter → proximity backfill to 2 → cap at 2.
     */
    fun selectCandidateIds(
        allRules: List<ArchRuleArchetype>,
        domains: Map<String, DomainState>,
    ): List<String> {
        var ids = allRules.filter { matchesRules(it, domains) }.map { it.id }
        if (ids.size < 2) {
            val allIds = allRules.map { it.id }
            val candidates = allIds.filter { it !in ids }
            val sorted = candidates.sortedBy { getDistance(it, domains, allRules) }
            val needed = 2 - ids.size
            ids = ids + sorted.take(needed)
        }
        if (ids.size > 2) {
            ids = ids.take(2)
        }
        return ids
    }
}
