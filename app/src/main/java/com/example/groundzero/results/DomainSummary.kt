package com.example.groundzero.results

import com.example.groundzero.assessment.BigFiveConstants
import org.json.JSONObject
import kotlin.math.abs

data class DomainSummaryLines(
    val levelKey: String,
    val levelMeaning: String,
    val domainMeanLine: String,
    val strengthsBullets: List<Pair<String, String>>,
    val midsBullets: List<Pair<String, String>>,
    val developmentBullets: List<Pair<String, String>>,
)

fun buildDomainSummary(domain: String, payload: JSONObject): DomainSummaryLines {
    val facets = BigFiveConstants.canonicalFacets(domain)
    val final = payload.optJSONObject("final") ?: JSONObject()
    val bucketObj = final.optJSONObject("bucket") ?: JSONObject()
    val aRawObj = payload.optJSONObject("phase2")?.optJSONObject("A_raw") ?: JSONObject()
    val domainMeanRaw = final.optDouble("domain_mean_raw", 3.0)

    val bucket: (String) -> String = { f ->
        bucketObj.optString(f, "Medium").ifBlank { "Medium" }
    }
    val raw: (String) -> Double = { f ->
        if (aRawObj.has(f)) aRawObj.getDouble(f) else 3.0
    }

    val lvlKey = when {
        domainMeanRaw >= 4.0 -> "high"
        domainMeanRaw <= 2.0 -> "low"
        else -> "medium"
    }
    val levelMeaning = when (lvlKey) {
        "high" -> "You can access this trait easily and consistently."
        "medium" -> "You can turn this trait on when needed, but it isn't your default."
        "low" ->
            if (domain == "N") {
                "You keep an even keel and recover quickly under pressure."
            } else {
                "This trait stays in the background unless the situation forces it."
            }
        else -> ""
    }

    val highs = facets.filter { bucket(it) == "High" }.sortedByDescending { raw(it) }.take(2)
    val mids = facets.filter { bucket(it) == "Medium" }
        .sortedBy { abs(3.0 - raw(it)) }
        .take(2)
    val lows = facets.filter { bucket(it) == "Low" }.sortedBy { raw(it) }.take(2)
    val isN = domain == "N"
    val strengths = if (isN) lows else highs
    val development = if (isN) highs else lows

    fun bullets(names: List<String>, interpKey: String): List<Pair<String, String>> =
        names.mapNotNull { name ->
            val line = facetInterpretation(domain, name, interpKey) ?: return@mapNotNull null
            name to firstSentence(line)
        }

    val sInterp = if (isN) "low" else "high"
    val dInterp = if (isN) "high" else "low"

    return DomainSummaryLines(
        levelKey = lvlKey,
        levelMeaning = levelMeaning,
        domainMeanLine = String.format("%.2f / 5", domainMeanRaw),
        strengthsBullets = bullets(strengths, sInterp),
        midsBullets = bullets(mids, "medium"),
        developmentBullets = bullets(development, dInterp),
    )
}
