package com.example.groundzero.results

/**
 * Narrative copy for the in-app Compatibility Report.
 * Domain synergy paragraphs mirror compatibility-report/app/compatibility/page.tsx domainSynergyCopy.
 * Per-facet conflict descriptions are added here (not in the web source).
 */
object CompatibilityReportCopy {

    // ── Domain synergy paragraphs ─────────────────────────────────────────────
    private val domainSynergy: Map<String, Map<String, String>> = mapOf(
        "O" to mapOf(
            "Align" to
                "Both of you are highly open to new experiences, leading to a life rich with shared exploration, creativity, and intellectual curiosity. You likely enjoy trying new things together and appreciate each other's imagination. The one risk: if neither provides a grounding force, a lack of structure can creep in.",
            "Complement" to
                "You're both curious, imaginative, and adventurous — one is just slightly more intense. That keeps ideas flowing without chaos, and the steadier partner keeps things from becoming overwhelming.",
            "Tension" to
                "One of you thrives on new ideas and experiences; the other prefers the familiar. This can create friction over plans, routines, and how much change feels comfortable. Naming this early prevents resentment from building on both sides.",
        ),
        "C" to mapOf(
            "Align" to
                "You have a similar approach to organisation and discipline, making it easy to coordinate on tasks and long-term goals. The risk is occasional rigidity — both pushing for structure when a pivot is needed.",
            "Complement" to
                "Both of you care about duty and order, though one takes it further. This keeps discipline strong without tipping into rigidity. The more flexible partner softens deadlines; the more structured partner keeps standards.",
            "Tension" to
                "One of you is highly structured and plan-oriented; the other is more spontaneous and flexible. This can cause conflict over deadlines, tidiness, and follow-through. The solution isn't changing personalities — it's designing shared systems that give each partner what they need.",
        ),
        "E" to mapOf(
            "Align" to
                "Your energy levels in social situations are well-matched — whether you both love being at the centre of the room or prefer quieter settings. This makes weekend plans, hosting decisions, and social obligations naturally easy to agree on.",
            "Complement" to
                "Energy levels are close. One is more assertive and active, the other steadier — which helps set a sustainable pace. The dynamic partner brings initiative; the calmer partner brings stability.",
            "Tension" to
                "One person is energised by social interaction; the other is drained by it. This is one of the most common sources of chronic friction in long-term relationships. Without a named agreement about social load, the introvert over-extends and the extrovert feels constrained.",
        ),
        "A" to mapOf(
            "Align" to
                "You share a common approach to cooperation and empathy, fostering a relationship built on mutual trust and understanding. The challenge: both of you may avoid necessary conflict because harmony feels safer.",
            "Complement" to
                "Shared trust and cooperation, with a small modesty or assertiveness gap. One may step forward more often — good when it's named, risky when it becomes a hidden role assignment.",
            "Tension" to
                "One person prioritises harmony and accommodation; the other values directness and scepticism. This can lead to misunderstandings: the accommodating partner silently carries resentment; the direct partner doesn't understand why. A named conflict protocol is not optional here — it's the foundation.",
        ),
        "N" to mapOf(
            "Align" to
                "Both feel stress in similar ways. This creates deep understanding and mutual validation — but also a risk of co-amplifying worry when neither can play the stable role. Build in external buffers: routines, anchors, or support systems.",
            "Complement" to
                "One of you is more emotionally reactive; the other is more stable. Done well, this makes a powerful stabilising dynamic. The risk: the stable partner can come across as cold or dismissive; the reactive partner can feel unseen. Explicit acknowledgement matters more than solutions.",
            "Tension" to
                "You have very different emotional responses to stress. One's sensitivity may seem excessive to the other; the other's stability may feel like indifference. This gap demands a shared language: what 'I need support' looks like, and what 'I need space' looks like.",
            "Watch" to
                "Your emotional reactivity differs, but it's in a mid-range that requires careful attention. One of you can buffer the other — but that role can become exhausting without rotation. Check in on who's carrying the emotional load.",
        ),
    )

    fun domainSynergyParagraph(domainKey: String, synergy: String): String =
        domainSynergy[domainKey]?.get(synergy) ?: "A notable dynamic in this area worth discussing openly."

    // ── Per-facet conflict descriptions ──────────────────────────────────────
    // Keyed by "D:FacetName" — describes what it means when one person is high and the other is low.
    private val facetConflictDescriptions: Map<String, String> = mapOf(
        // Openness
        "O:Imagination" to
            "One of you lives in ideas and mental worlds; the other stays grounded in what's concrete and real. Creative decisions, names for future plans, and abstract conversations will feel exciting to one partner and exhausting to the other.",
        "O:Artistic Interests" to
            "One of you finds deep meaning in art, aesthetics, and beauty; the other barely notices them. This can surface in home design, how you spend free time, and whether cultural outings feel like enrichment or obligation.",
        "O:Emotionality" to
            "One partner connects to the world emotionally — through music, stories, atmosphere — while the other processes things analytically. This isn't a conflict of care; it's a difference in emotional bandwidth. The feeling partner may seem 'too much'; the analytical partner may seem 'closed off'.",
        "O:Adventurousness" to
            "One of you jumps at new experiences; the other needs a comfortable baseline. Travel decisions, restaurant choices, weekend plans — the high-adventurousness partner sees unexplored territory while the other sees unnecessary risk.",
        "O:Intellect" to
            "One partner is drawn to abstract ideas, theories, and intellectual exploration; the other prefers practical, applied thinking. Long conversations about ideas can feel stimulating to one and pointless to the other.",
        "O:Values Openness" to
            "One of you questions conventions and traditional norms; the other relies on established values for stability. This can surface in politics, religion, social roles, or parenting philosophy — areas that feel deeply personal rather than negotiable.",
        // Conscientiousness
        "C:Self-Efficacy" to
            "One partner trusts their own competence; the other doubts it. This affects how each responds to challenges: one charges ahead, one seeks reassurance. Over time, the confident partner may feel they're carrying the weight; the self-doubting partner may feel judged.",
        "C:Orderliness" to
            "One of you organises the physical environment systematically; the other leaves things where they fall. This is one of the most common practical friction points in cohabitation. Neither is wrong — but without explicit agreements, resentment accumulates silently.",
        "C:Dutifulness" to
            "One partner fulfils obligations even when they don't feel like it; the other follows their energy. Over time, the dutiful partner may feel overburdened; the flexible partner may feel nagged.",
        "C:Achievement-Striving" to
            "One of you is driven by ambitious goals; the other is comfortable with 'good enough'. This can surface in career choices, project quality, and how each defines success — and can lead to one feeling pulled back and the other feeling pressured.",
        "C:Self-Discipline" to
            "One partner starts and finishes tasks without external prompting; the other relies on deadlines, mood, or external pressure. The disciplined partner may see the other as unreliable; the flexible partner may feel controlled by the other's standards.",
        "C:Cautiousness" to
            "One of you thinks decisions through carefully before acting; the other prefers to act and adjust. This creates friction on timing — one partner is ready to move; the other needs more deliberation.",
        // Extraversion
        "E:Friendliness" to
            "One partner leads with warmth and affection in every interaction; the other is more reserved until comfortable. The reserved partner can seem cold to the warm partner's social circle, and the warm partner's constant affection can feel overwhelming to the reserved one.",
        "E:Gregariousness" to
            "One of you loves being around people in groups; the other needs solo time to recharge. This is the classic introvert-extrovert split — manageable with an explicit social calendar and protected recharge time.",
        "E:Assertiveness" to
            "One partner takes charge in group settings and conversations; the other prefers to listen and support. The assertive partner may dominate shared decisions; the listener may feel invisible or may quietly resent the power dynamic.",
        "E:Activity Level" to
            "One of you keeps a full, busy schedule as a default; the other needs downtime and a slower pace. This affects how you spend evenings, weekends, and holidays — one partner's 'recovery day' is the other's 'wasted opportunity'.",
        "E:Excitement-Seeking" to
            "One partner seeks thrills, intensity, and high stimulation; the other finds comfort in calm environments. This shapes social choices, risk tolerance, and what 'a good time' means.",
        "E:Cheerfulness" to
            "One partner is naturally buoyant, optimistic, and expressive with positive emotion; the other is more reserved or serious. The cheerful partner can feel like their energy is deflated by the other; the serious partner can feel pressure to perform a happiness they don't naturally feel.",
        // Agreeableness
        "A:Trust" to
            "One of you extends trust readily; the other is more sceptical. This creates divergent readings of the same events — one sees goodwill, the other sees risk. Without naming this, the trusting partner feels they're being made paranoid; the sceptical partner feels their caution is dismissed.",
        "A:Morality" to
            "One partner holds a strong commitment to honesty and directness even when uncomfortable; the other is more pragmatic about truth-telling. This can surface in 'white lie' situations and in how each handles feedback, which creates recurring small conflicts.",
        "A:Altruism" to
            "One of you extends help proactively and prioritises others' needs; the other is more self-focused. The high-altruism partner may feel taken for granted; the lower-altruism partner may feel guilted into giving more than feels natural.",
        "A:Cooperation" to
            "One partner will concede to avoid conflict; the other argues for the best outcome. The cooperative partner's silence is often mistaken for agreement — until it isn't. The assertive partner may not even realise a decision was contested.",
        "A:Modesty" to
            "One of you downplays their own achievements; the other is comfortable with self-promotion. In public, this looks like one partner shining and the other fading. In private, it can create an imbalance in who claims credit and whose contributions go unnoticed.",
        "A:Sympathy" to
            "One partner is deeply moved by others' difficulties and responds with emotional support; the other is more pragmatic and solution-focused. When the empathetic partner needs to be heard, the pragmatic partner jumps to fixes — which can feel dismissive even when well-intentioned.",
        // Neuroticism
        "N:Anxiety" to
            "One of you scans for threats and future problems; the other lives in the present with minimal worry. The anxious partner can feel unsupported when the calm partner doesn't take their concerns seriously; the calm partner can feel pulled into worries that feel hypothetical.",
        "N:Anger" to
            "One partner reaches a frustration threshold quickly; the other rarely escalates. When they conflict, one enters fight mode while the other is still in conversation mode. Managing the escalation gap is more important than managing the topic that triggered it.",
        "N:Depression" to
            "One partner is prone to low mood, pessimism, or discouragement; the other maintains a stable or positive baseline. The lower-mood partner can feel misunderstood or pressure to 'cheer up'; the stable partner can feel worn down by the emotional weight.",
        "N:Self-Consciousness" to
            "One of you frequently checks how others perceive them; the other has low sensitivity to social judgment. The self-conscious partner may need more reassurance in social settings; the confident partner may underestimate how public interactions affect the other.",
        "N:Immoderation" to
            "One partner struggles to resist impulses — food, spending, screens, substances; the other has strong self-regulation. This can create real-world friction around money, health habits, and shared environments.",
        "N:Vulnerability" to
            "One of you feels overwhelmed when multiple stressors hit simultaneously; the other stays operational under pressure. During crises, the overwhelmed partner needs support; the resilient partner may inadvertently take over rather than co-regulate.",
    )

    fun facetConflictDescription(facetKey: String): String =
        facetConflictDescriptions[facetKey]
            ?: "These two traits pull in opposite directions — one partner scores high, the other low. Name it early: when it surfaces in behaviour, it rarely looks like a trait difference and more like a character flaw."

    // Keyed by "D:FacetName" — what it means when both score at the same extreme (both high or both low).
    private val facetAlignDescriptions: Map<String, String> = mapOf(
        "O:Imagination" to
            "You both lean the same way on imagination — either you share rich inner worlds and what-ifs, or you both keep feet on the ground. Easy empathy for how each other thinks; the risk is nobody plays the 'reality anchor' when you need one.",
        "O:Artistic Interests" to
            "Aesthetic life matters to both of you in the same direction — you chase beauty together, or you both treat it as optional. Shared taste simplifies choices; watch for blind spots when one domain needs craft the other barely notices.",
        "O:Emotionality" to
            "You feel the atmosphere of a room — or both stay cool — in sync. That cuts friction about 'why it matters,' but two highly emotional partners can amplify a mood; two cool ones can miss when warmth is needed.",
        "O:Adventurousness" to
            "You match on appetite for novelty versus routine. Plans and risk feel aligned — the downside is if you're both novelty-seekers, stability can slip; if you're both homebodies, growth may need a deliberate nudge.",
        "O:Intellect" to
            "You explore ideas at a similar depth — theory people together, or both pragmatic. Conversations stay in the same lane; the gap to watch is when the world needs action and neither wants to stop debating.",
        "O:Values Openness" to
            "You question (or respect) tradition in parallel. Fewer hidden value clashes — but two rebels can destabilise without a shared anchor; two traditionalists can resist change the relationship actually needs.",
        "C:Self-Efficacy" to
            "You share confidence levels about getting things done — both self-assured or both doubting. That makes expectations legible; two low-efficacy partners may need external structure so neither absorbs all the anxiety.",
        "C:Orderliness" to
            "Your tolerance for clutter and systems lines up — tidy together or relaxed together. Household friction drops; the risk is two loose styles without a reset, or two rigid ones when flexibility would help.",
        "C:Dutifulness" to
            "Obligation lands the same way for both of you — you keep promises in sync, or you both follow energy. Less nagging about 'should' — but two highly dutiful people can overcommit; two flexible ones can let things slip.",
        "C:Achievement-Striving" to
            "Ambition rhymes — you push toward goals at a similar intensity, or you're both content with enough. Career and project pace feel mutual; watch for two strivers burning out, or two coasters avoiding hard conversations.",
        "C:Self-Discipline" to
            "Follow-through matches — both self-starters or both deadline-driven by mood. Less resentment about reliability; two strict disciplinarians can feel joyless, two loose ones may need external accountability.",
        "C:Cautiousness" to
            "You deliberate on the same clock — both careful or both ready to move. Fewer timing fights; two cautious partners can stall together; two impulsive ones may skip due diligence.",
        "E:Friendliness" to
            "Warmth in first contact aligns — both open or both reserved until trust builds. Social expectations match; two very warm people may overcommit socially; two cool fronts can read as distant to outsiders.",
        "E:Gregariousness" to
            "Group energy fits — you both recharge around people or both need solo air. Calendar negotiations get easier; two group-lovers can overbook; two solitude-seekers can under-invest in community.",
        "E:Assertiveness" to
            "You take space in conversations similarly — both forward or both hanging back. Fewer invisible dominance games; two assertive voices need turn-taking; two quiet ones may need a named 'who speaks first' rule.",
        "E:Activity Level" to
            "Pace matches — busy together or slow together. Weekend rhythm feels fair; two always-on people risk burnout; two low-pace people may need a push for novelty.",
        "E:Excitement-Seeking" to
            "You chase stimulation on the same curve — thrill together or calm together. Fewer fights about 'how much is enough'; two high-seekers can take real risks; two low-seekers can slip into a rut.",
        "E:Cheerfulness" to
            "Positive affect lands similarly — both expressive and upbeat, or both understated. Emotional weather matches; two relentlessly cheerful people can skip processing hard feelings; two flat moods may need an intentional joy practice.",
        "A:Trust" to
            "You extend trust on the same default — both open-handed or both careful. Fewer 'why don't you believe me' loops; two trusting people need fraud awareness; two sceptical people need explicit repair rituals.",
        "A:Morality" to
            "Honesty norms align — both blunt or both tact-first. Less surprise at feedback style; two brutal truth-tellers need warmth protocols; two conflict-avoidant truth-benders need a naming rule for hard topics.",
        "A:Altruism" to
            "Helping instinct matches — both generous or both self-protective. Giving feels fair; two givers risk burnout; two self-focused people need explicit reciprocity checks.",
        "A:Cooperation" to
            "Both of you default to seeking consensus over winning arguments — or both push for outcomes. Decisions feel easy when aligned; the risk is that neither calls out a bad choice loud enough, or both compete without noticing.",
        "A:Modesty" to
            "You claim credit the same way — both self-effacing or both comfortable shining. Public face stays consistent; two modest people may undersell the pair; two self-promoters may crowd each other out.",
        "A:Sympathy" to
            "You respond to others' pain with the same instinct — both heart-first or both fix-first. Less mismatch in support style; two empathetic people can drown in others' problems; two pragmatic people may skip tenderness.",
        "N:Anxiety" to
            "Threat-scanning matches — both vigilant or both steady. You validate each other's baseline; two anxious partners can spiral; two ultra-calm ones can miss real risks.",
        "N:Anger" to
            "Frustration rises on a similar fuse — both quick or both slow. Escalation feels predictable; two hot fuses need repair skills; two slow burns may stockpile resentment.",
        "N:Depression" to
            "Mood gravity aligns — you dip and lift in parallel more than opposites would. Less 'cheer up' invalidation; two low-baseline people need external support; two sunny people may skip grief work.",
        "N:Self-Consciousness" to
            "Social vigilance matches — both self-monitoring or both carefree. Fewer 'you're overthinking' dismissals; two self-conscious people may avoid exposure; two oblivious ones may embarrass each other.",
        "N:Immoderation" to
            "Impulse control lines up — both struggle or both tight. Fewer 'why did you do that' lectures; two immoderate people need guardrails; two rigid people may lack joy.",
        "N:Vulnerability" to
            "Stress capacity matches — both overwhelmed together or both steady together. Crises feel mutual; two overwhelmed partners need outside help; two stoics may skip asking for support.",
    )

    fun facetAlignDescription(facetKey: String): String =
        facetAlignDescriptions[facetKey]
            ?: "You reinforce each other on this trait — shared intensity lowers day-to-day friction, but the same blind spot can show up twice."

    // ── Section intros ────────────────────────────────────────────────────────
    const val howItWorksIntro: String =
        "Scores compare your domain means (1–5) pairwise. Closer profiles score higher. Synergy labels describe how similar or complementary you are — Align, Complement, Tension, or Watch. All scores are deterministic: same answers always produce the same report."

    const val keyDynamicsIntro: String =
        "Alignment pairs are facets where you both score at the same extreme — shared strengths or shared challenges. Conflict pairs are facets where one scores high and the other scores low — the most visibly impactful divergences."

    const val playbooksIntro: String =
        "These protocols are triggered by your specific domain and facet profile. They're designed to be adopted, not just read — set a calendar invite, write the agreement down, or say the words out loud."

    const val scenariosIntro: String =
        "Common situations where your profile combination creates predictable pressure points — and the guardrail that prevents them from becoming recurring conflicts."

    fun alignmentHighlightsLine(facetLabels: List<String>): String =
        if (facetLabels.isEmpty()) {
            "No shared trait extremes detected. Your alignment lives in the mid-range — adaptable, but without the strong pull of matching intensity."
        } else {
            "You share strong alignment on: ${facetLabels.joinToString(", ")}. Where you both score at the same extreme, you're naturally reinforcing each other — these are your lowest-friction areas."
        }
}
