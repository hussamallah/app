import Foundation

enum MeanBucket: String, Codable {
    case high = "High"
    case medium = "Medium"
    case low = "Low"
}

struct DomainState: Codable {
    let mean: Double
    let bucket: MeanBucket
    let facet: [String: MeanBucket]
}

struct FacetItem: Codable, Identifiable {
    let id: String
    let domain: String
    let facet: String
    let binaryQuestion: String
    let likertQuestion: String

    enum CodingKeys: String, CodingKey {
        case id
        case facet
        case binaryQuestion = "binary_question"
        case likertQuestion = "likert_question"
    }
}

struct DomainSpec: Codable {
    let facets: [FacetItem]
}

struct AssessmentBank: Codable {
    let version: String
    let domainOrder: [String]
    let domains: [String: DomainSpec]

    enum CodingKeys: String, CodingKey {
        case version
        case domainOrder = "domain_order"
        case domains
    }

    var facetList: [FacetItem] {
        domainOrder.flatMap { domains[$0]?.facets ?? [] }
    }
}

enum BigFiveConstants {
    static let domainOrder = ["O", "C", "E", "A", "N"]
    static let domainLabels = [
        "O": "Openness",
        "C": "Conscientiousness",
        "E": "Extraversion",
        "A": "Agreeableness",
        "N": "Neuroticism",
    ]

    static func canonicalFacets(_ domain: String) -> [String] {
        switch domain {
        case "O": return ["Imagination", "Artistic Interests", "Emotionality", "Adventurousness", "Intellect", "Values Openness"]
        case "C": return ["Self-Efficacy", "Orderliness", "Dutifulness", "Achievement-Striving", "Self-Discipline", "Cautiousness"]
        case "E": return ["Friendliness", "Gregariousness", "Assertiveness", "Activity Level", "Excitement-Seeking", "Cheerfulness"]
        case "A": return ["Trust", "Morality", "Altruism", "Cooperation", "Modesty", "Sympathy"]
        case "N": return ["Anxiety", "Anger", "Depression", "Self-Consciousness", "Immoderation", "Vulnerability"]
        default: return []
        }
    }

    static func toCanonicalFacet(domain: String, facet: String) -> String {
        if domain == "O" && facet == "Values Openness" {
            return "Liberalism"
        }
        return facet
    }
}
