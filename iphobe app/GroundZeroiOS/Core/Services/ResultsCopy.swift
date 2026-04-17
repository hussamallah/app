import Foundation

struct PathCardCopy {
    let number: String
    let title: String
    let subtitle: String
    let description: String
    let webRoute: String
}

enum ResultsCopy {
    static let archetypeTaglines: [String: String] = [
        "sovereign": "Decisive authority establishing order from chaos.",
        "rebel": "Shattering fixed limits to create movement.",
        "visionary": "Sprinting toward horizons unseen by others.",
        "navigator": "Steering through fog via constant adaptation.",
        "equalizer": "Leveling power to ensure absolute fairness.",
        "guardian": "Shielding the vulnerable to preserve safety.",
        "seeker": "Piercing surface illusions to reveal truth.",
        "architect": "Designing enduring frameworks to prevent collapse.",
        "spotlight": "Commanding attention to fuel dynamic action.",
        "diplomat": "Bridging deep divides to secure harmony.",
        "partner": "Forging identity through deep loyal bonds.",
        "provider": "Deriving purpose from fulfilling others' needs.",
        "catalyst": "Igniting sudden motion to shatter stagnation.",
        "vessel": "Channeling emotion and intensity into composed, precise expression.",
        "sentinel": "Maintaining a fixed watch for risk and drift.",
    ]

    static let portalPathCards: [PathCardCopy] = [
        .init(number: "01", title: "THE MIRROR", subtitle: "PSYCHOLOGY & NARRATIVE", description: "Read your story. Understand your strengths, your shadow, and the why behind your actions.", webRoute: "/who?rid="),
        .init(number: "02", title: "SYSTEM OVERVIEW", subtitle: "OPERATIONAL PARAMETERS", description: "Select a core to analyze. Explore your five domains, facet scores, and the operational parameters that drive your behavior.", webRoute: "/results?rid="),
        .init(number: "03", title: "THE WAR ROOM", subtitle: "CONFLICT & STRATEGY", description: "Where the friction lives. Identify your internal conflicts and receive your operational orders.", webRoute: "/conflict-patterns?rid="),
        .init(number: "04", title: "OPERATION MANUAL", subtitle: "TACTICS & EXECUTION", description: "Your personalized playbook. Actionable advice for your career, decisions, routines, and daily operations.", webRoute: "/results/operation-of-life-report?rid="),
        .init(number: "05", title: "EXISTENTIAL CIRCUITS", subtitle: "ENERGY & FLOW", description: "Map your five core circuits. Understand how Energy, Clarity, Structure, Bond, and Drive shape your behavior.", webRoute: "/existential-circuits?rid="),
        .init(number: "06", title: "COMPATIBILITY REPORT", subtitle: "RELATIONSHIPS & SYNERGY", description: "Analyze interpersonal dynamics. Discover points of harmony and friction between you and another person.", webRoute: "/compatibility?ridA="),
    ]
}
