package com.example.groundzero.results

/** Mirrors the role of `FACET_INTERPRETATIONS` in `app content/summary/page.tsx` for gz_linear bank facets. */
data class FacetTriad(val high: String, val medium: String, val low: String)

private val BY_DOMAIN: Map<String, Map<String, FacetTriad>> = mapOf(
    "O" to mapOf(
        "Imagination" to FacetTriad(
            high = "You generate inner worlds quickly; ideas arrive as scenes, not bullet points.",
            medium = "You can daydream productively when you choose to, then return to the task.",
            low = "You default to concrete facts and what is in front of you before inventing hypotheticals.",
        ),
        "Artistic Interests" to FacetTriad(
            high = "You seek beauty and craft; aesthetics change your decisions and your mood.",
            medium = "You notice design when it matters and can ignore noise when goals are clear.",
            low = "You prioritize function and speed over ornament; beauty is optional, not fuel.",
        ),
        "Emotionality" to FacetTriad(
            high = "Feelings carry information fast; you register nuance in yourself and others.",
            medium = "You feel deeply at times while still steering with reason when stakes are high.",
            low = "You stabilize with logic first; emotions are signals, not the whole map.",
        ),
        "Adventurousness" to FacetTriad(
            high = "Novelty resets you; new places, foods, and methods keep you alive.",
            medium = "You mix reliable routines with deliberate experiments on a cadence you control.",
            low = "Proven paths reduce risk; you change routines when the upside is obvious.",
        ),
        "Intellect" to FacetTriad(
            high = "Abstract puzzles and models feel like oxygen; complexity is interesting, not threatening.",
            medium = "You enjoy theory when it connects to a decision you actually have to make.",
            low = "You prefer plain language and tangible examples; abstractions cost energy.",
        ),
        "Values Openness" to FacetTriad(
            high = "You pressure-test norms when they stop matching reality or justice.",
            medium = "You respect tradition while updating beliefs when better evidence appears.",
            low = "You protect stability; change needs a clear case before you rewrite rules you trust.",
        ),
    ),
    "C" to mapOf(
        "Self-Efficacy" to FacetTriad(
            high = "You expect to solve hard things; setbacks read as data, not verdicts.",
            medium = "Confidence grows with preparation; you size tasks before you commit.",
            low = "You double-check readiness; doubt can slow starts until proof appears.",
        ),
        "Orderliness" to FacetTriad(
            high = "Clear surfaces, calendars, and sequences reduce anxiety and raise output.",
            medium = "You organize when the payoff is clear; some chaos is tolerable short term.",
            low = "Spontaneity and speed beat tidiness; you clean up after the sprint.",
        ),
        "Dutifulness" to FacetTriad(
            high = "Commitments are sacred; you finish what you said you would, even when tired.",
            medium = "You keep most promises and negotiate early when you cannot.",
            low = "Flexibility sometimes wins over rigid duty; you renegotiate instead of silently failing.",
        ),
        "Achievement-Striving" to FacetTriad(
            high = "You raise the bar repeatedly; good enough rarely stays good enough for long.",
            medium = "You push when it matters and conserve energy when stakes are lower.",
            low = "You protect sustainability; ambition is tuned to health and relationships.",
        ),
        "Self-Discipline" to FacetTriad(
            high = "You start without waiting for perfect mood; follow-through is a default setting.",
            medium = "You can lock in focus for stretches, then need recovery windows.",
            low = "Distractions win often; you rely on environment design and deadlines to move.",
        ),
        "Cautiousness" to FacetTriad(
            high = "You slow down on irreversible choices; risk is calculated, not romanticized.",
            medium = "You balance speed and caution based on reversibility and blast radius.",
            low = "You learn by doing; analysis paralysis is rarer than occasional sharp turns.",
        ),
    ),
    "E" to mapOf(
        "Friendliness" to FacetTriad(
            high = "Warmth is easy; people feel welcomed quickly in your presence.",
            medium = "You warm up after trust cues; first minutes can be reserved.",
            low = "You are selective with warmth; depth beats breadth in your social energy.",
        ),
        "Gregariousness" to FacetTriad(
            high = "Crowds and bustle refill you; solitude is useful, not your default fuel.",
            medium = "You like people time in doses; solo work still matters.",
            low = "Quiet and one-to-one beat big rooms; parties cost more than they pay.",
        ),
        "Assertiveness" to FacetTriad(
            high = "You take space in rooms; you name disagreements instead of swallowing them.",
            medium = "You assert when stakes warrant it; harmony still has a price you watch.",
            low = "You prefer influence through questions and timing over volume and dominance.",
        ),
        "Activity Level" to FacetTriad(
            high = "Packed days feel normal; stillness can feel like missing the plot.",
            medium = "You oscillate between bursts of motion and recovery without guilt.",
            low = "You protect a slower pace; hustle culture is not your religion.",
        ),
        "Excitement-Seeking" to FacetTriad(
            high = "Thrill sharpens you; risk makes you feel awake and decisive.",
            medium = "You enjoy spikes of intensity, then return to steadier rhythms.",
            low = "You prefer predictable safety margins; novelty is optional seasoning.",
        ),
        "Cheerfulness" to FacetTriad(
            high = "Joy is visible; you lift morale without trying hard.",
            medium = "Your mood is steady with bright spots; you are not performatively upbeat.",
            low = "You read as serious or calm; cheer shows in loyalty more than laughter volume.",
        ),
    ),
    "A" to mapOf(
        "Trust" to FacetTriad(
            high = "You default to goodwill; cynicism is a tool, not a home.",
            medium = "Trust is earned in layers; you verify without insulting.",
            low = "You verify first; openness follows evidence, not hope.",
        ),
        "Morality" to FacetTriad(
            high = "Truth is non-negotiable even when it costs comfort.",
            medium = "You weigh honesty against kindness case by case.",
            low = "You accept pragmatic nuance; white lies can prevent unnecessary damage.",
        ),
        "Altruism" to FacetTriad(
            high = "Helping is reflexive; others' pain pulls you into action.",
            medium = "You help when it fits capacity; boundaries exist.",
            low = "You protect bandwidth; generosity is intentional, not automatic.",
        ),
        "Cooperation" to FacetTriad(
            high = "You yield to keep peace when the relationship matters more than the point.",
            medium = "You negotiate; cooperation is a strategy, not surrender.",
            low = "You push for best outcomes; harmony is not always the top priority.",
        ),
        "Modesty" to FacetTriad(
            high = "You downplay wins; spotlight can feel exposing.",
            medium = "You share credit but still own growth when it matters.",
            low = "You are comfortable owning achievements; visibility supports your goals.",
        ),
        "Sympathy" to FacetTriad(
            high = "Others' pain lands in your body; compassion is fast and deep.",
            medium = "You care with limits; you help without drowning.",
            low = "You protect emotional distance; problems need boundaries to stay solvable.",
        ),
    ),
    "N" to mapOf(
        "Anxiety" to FacetTriad(
            high = "The future broadcasts warnings; your mind runs scenarios often.",
            medium = "You worry in waves; routines and facts can calm the loop.",
            low = "Pressure reads as manageable; you return to baseline quickly.",
        ),
        "Anger" to FacetTriad(
            high = "Irritation spikes fast; it can simmer under politeness.",
            medium = "You feel anger, name it, and choose responses more often than explosions.",
            low = "It takes a lot to anger you; patience is a default.",
        ),
        "Depression" to FacetTriad(
            high = "Low moods can linger; hope feels effortful during dips.",
            medium = "You rebound with support, time, or meaning—not instantly, but reliably.",
            low = "Your baseline skews optimistic; sadness is situational, not structural.",
        ),
        "Self-Consciousness" to FacetTriad(
            high = "You track how you are seen; social replay is common.",
            medium = "You notice audience sometimes; it moderates rather than paralyzes.",
            low = "You rarely obsess over perception; self-focus is practical, not theatrical.",
        ),
        "Immoderation" to FacetTriad(
            high = "Impulses win quick battles; cravings can hijack plans.",
            medium = "You sometimes splurge or binge; recovery follows awareness.",
            low = "You regulate urges well; discipline feels natural more than heroic.",
        ),
        "Vulnerability" to FacetTriad(
            high = "Stress hits hard; overload shows up in body and focus fast.",
            medium = "You cope with help, pacing, or skills; recovery is real but not instant.",
            low = "You absorb pressure; stress is information, not a shutdown switch.",
        ),
    ),
)

fun facetInterpretation(domain: String, facet: String, levelKey: String): String? {
    val triad = BY_DOMAIN[domain]?.get(facet) ?: return null
    return when (levelKey.lowercase()) {
        "high" -> triad.high
        "medium" -> triad.medium
        "low" -> triad.low
        else -> null
    }
}

fun firstSentence(text: String): String {
    val parts = text.split(Regex("(?<=\\.)\\s+"))
    return parts.firstOrNull()?.trim()?.ifBlank { text } ?: text
}
