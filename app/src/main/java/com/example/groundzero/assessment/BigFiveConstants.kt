package com.example.groundzero.assessment

/** Mirrors `@/lib/bigfive/constants` domain keys used by GZFinalAssessment. */
object BigFiveConstants {

    val DOMAIN_ORDER: List<String> = listOf("O", "C", "E", "A", "N")

    val DOMAIN_LABELS: Map<String, String> = mapOf(
        "O" to "Openness",
        "C" to "Conscientiousness",
        "E" to "Extraversion",
        "A" to "Agreeableness",
        "N" to "Neuroticism",
    )

    /** Must match `facet` strings in `bankv1.json` (gz_linear_spec) for score keys / domain means. */
    fun canonicalFacets(domain: String): List<String> = when (domain) {
        "O" -> listOf(
            "Imagination",
            "Artistic Interests",
            "Emotionality",
            "Adventurousness",
            "Intellect",
            "Values Openness",
        )
        "C" -> listOf(
            "Self-Efficacy",
            "Orderliness",
            "Dutifulness",
            "Achievement-Striving",
            "Self-Discipline",
            "Cautiousness",
        )
        "E" -> listOf(
            "Friendliness",
            "Gregariousness",
            "Assertiveness",
            "Activity Level",
            "Excitement-Seeking",
            "Cheerfulness",
        )
        "A" -> listOf(
            "Trust",
            "Morality",
            "Altruism",
            "Cooperation",
            "Modesty",
            "Sympathy",
        )
        "N" -> listOf(
            "Anxiety",
            "Anger",
            "Depression",
            "Self-Consciousness",
            "Immoderation",
            "Vulnerability",
        )
        else -> emptyList()
    }

    /** Same remap as `toCanonicalFacet` in GZFinalAssessment.tsx */
    fun toCanonicalFacet(domain: String, facet: String): String =
        if (domain == "O" && facet == "Values Openness") "Liberalism" else facet
}
