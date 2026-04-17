package com.example.groundzero.results

/** Static copy mirrored from `app content/portal/page.tsx`, `page.tsx`, and related routes. */

val ARCHETYPE_TAGLINES: Map<String, String> = mapOf(
    "sovereign" to "Decisive authority establishing order from chaos.",
    "rebel" to "Shattering fixed limits to create movement.",
    "visionary" to "Sprinting toward horizons unseen by others.",
    "navigator" to "Steering through fog via constant adaptation.",
    "equalizer" to "Leveling power to ensure absolute fairness.",
    "guardian" to "Shielding the vulnerable to preserve safety.",
    "seeker" to "Piercing surface illusions to reveal truth.",
    "architect" to "Designing enduring frameworks to prevent collapse.",
    "spotlight" to "Commanding attention to fuel dynamic action.",
    "diplomat" to "Bridging deep divides to secure harmony.",
    "partner" to "Forging identity through deep loyal bonds.",
    "provider" to "Deriving purpose from fulfilling others' needs.",
    "catalyst" to "Igniting sudden motion to shatter stagnation.",
    "vessel" to "Channeling emotion and intensity into composed, precise expression — holding the inner weather without spilling it.",
    "sentinel" to "Maintaining a fixed watch for risk and drift; responding with proportion, not panic, when the signal flips.",
)

data class PathCardCopy(
    val number: String,
    val title: String,
    val subtitle: String,
    val description: String,
    val webRoute: String,
)

val PORTAL_PATH_CARDS: List<PathCardCopy> = listOf(
    PathCardCopy(
        number = "01",
        title = "THE MIRROR",
        subtitle = "PSYCHOLOGY & NARRATIVE",
        description = "Read your story. Understand your strengths, your shadow, and the 'why' behind your actions.",
        webRoute = "/who?rid=",
    ),
    PathCardCopy(
        number = "02",
        title = "SYSTEM OVERVIEW",
        subtitle = "OPERATIONAL PARAMETERS",
        description = "Select a core to analyze. Explore your five domains, facet scores, and the operational parameters that drive your behavior.",
        webRoute = "/results?rid=",
    ),
    PathCardCopy(
        number = "03",
        title = "THE WAR ROOM",
        subtitle = "CONFLICT & STRATEGY",
        description = "Where the friction lives. Identify your internal conflicts and receive your operational orders.",
        webRoute = "/conflict-patterns?rid=",
    ),
    PathCardCopy(
        number = "04",
        title = "OPERATION MANUAL",
        subtitle = "TACTICS & EXECUTION",
        description = "Your personalized playbook. Actionable advice for your career, decisions, routines, and daily operations.",
        webRoute = "/results/operation-of-life-report?rid=",
    ),
    PathCardCopy(
        number = "05",
        title = "EXISTENTIAL CIRCUITS",
        subtitle = "ENERGY & FLOW",
        description = "Map your five core circuits. Understand how Energy, Clarity, Structure, Bond, and Drive shape your behavior.",
        webRoute = "/existential-circuits?rid=",
    ),
    PathCardCopy(
        number = "06",
        title = "COMPATIBILITY REPORT",
        subtitle = "RELATIONSHIPS & SYNERGY",
        description = "Analyze interpersonal dynamics. Discover points of harmony and friction between you and another person.",
        webRoute = "/compatibility?ridA=",
    ),
)

const val LANDING_IDENTITY_ENGINE_BLURB =
    "Ground Zero is not just a test—it's an identity engine. By blending psychology, determinism, and design, it delivers a reproducible way to see who you are, how you operate, and what tensions shape your life."

const val EXISTENTIAL_CIRCUITS_TOOLTIP =
    "These are the core processes you use to interact with the world, such as how you manage energy, seek clarity, or build structure."

const val CONFLICT_PAGE_TITLE = "Conflict Patterns"
const val CONFLICT_PAGE_INTRO =
    "Internal tensions where two ways of being both feel true. Naming them helps you choose moves instead of spiraling."
