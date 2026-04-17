import Foundation

struct ArchetypeRulesPayload: Codable {
    let archetypes: [ArchetypeRule]
    let tieLayer: TieLayer?

    enum CodingKeys: String, CodingKey {
        case archetypes
        case tieLayer = "tie_layer"
    }
}

struct ArchetypeRule: Codable {
    let id: String
    let rules: RuleDefinition
}

struct RuleDefinition: Codable {
    let domains: [String: Bucket]
    let facetClusters: [String: FacetClusterDefinition]?

    enum CodingKeys: String, CodingKey {
        case domains
        case facetClusters = "facet_clusters"
    }
}

struct FacetClusterDefinition: Codable {
    let require: [FacetRequirement]
    let minHigh: Int?
    let facets: [String]?
    let anyHigh: [String]?
    let anyLow: [String]?

    enum CodingKeys: String, CodingKey {
        case require
        case minHigh = "min_high"
        case facets
        case anyHigh = "any_high"
        case anyLow = "any_low"
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        require = try c.decodeIfPresent([FacetRequirement].self, forKey: .require) ?? []
        minHigh = try c.decodeIfPresent(Int.self, forKey: .minHigh)
        facets = try c.decodeIfPresent([String].self, forKey: .facets)
        anyHigh = try c.decodeIfPresent([String].self, forKey: .anyHigh)
        anyLow = try c.decodeIfPresent([String].self, forKey: .anyLow)
    }
}

struct FacetRequirement: Codable {
    let facet: String
    let bucket: Bucket
}

struct TieLayer: Codable {
    let fallbacks: TieFallbacks?
}

struct TieFallbacks: Codable {
    let triadQuestion: String?

    enum CodingKeys: String, CodingKey {
        case triadQuestion = "triad_question"
    }
}

enum Bucket: String, Codable {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
}
