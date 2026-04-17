package com.example.groundzero.results

import com.example.groundzero.assessment.FacetItem
import com.example.groundzero.assessment.BigFiveConstants

/**
 * Encodes one facet path through Bin → Likert (or Yup). Values 0–10; matches assessment UI in [com.example.groundzero.ui.GroundZeroAssessmentScreen].
 * 0–4: No + Likert (1..5) respectively via index = likert1to5 - 1 on No branch.
 * 5–9: Yes + Likert (1..5) via 5 + (likert1to5 - 1).
 * 10: Yup (skip Likert, raw 5.0).
 */
object FacetOutcomeCode {

    private val likertMap: Map<Int, Double> = mapOf(5 to 1.0, 4 to 2.0, 3 to 3.0, 2 to 4.0, 1 to 5.0)

    fun fromNoLikert(likert1to5: Int): Int = (likert1to5 - 1).coerceIn(0, 4)

    fun fromYesLikert(likert1to5: Int): Int = 5 + (likert1to5 - 1).coerceIn(0, 4)

    const val YUP = 10

    fun toRawScore(code: Int): Double {
        require(code in 0..10) { "facet code must be 0..10" }
        if (code == YUP) return 5.0
        if (code < 5) {
            val likert1to5 = code + 1
            return likertMap[likert1to5] ?: 3.0
        }
        val likert1to5 = code - 5 + 1
        val base = likertMap[likert1to5] ?: 3.0
        return (base + 0.5).coerceAtMost(5.0)
    }

    fun applyToScores(
        item: FacetItem,
        code: Int,
        put: (String, String, Double) -> Unit,
    ) {
        val key = BigFiveConstants.toCanonicalFacet(item.domain, item.facet)
        put(item.domain, key, toRawScore(code))
    }
}
