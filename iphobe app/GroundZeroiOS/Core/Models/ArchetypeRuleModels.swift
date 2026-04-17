import Foundation

struct ArchetypeRulesPayload: Codable {
    let archetypes: [ArchetypeRule]
}

struct ArchetypeRule: Codable {
    let id: String
    let rules: RuleDefinition
}

struct RuleDefinition: Codable {
    let domains: [String: Bucket]
    let facetClusters: [String: FacetCluster]?

    enum CodingKeys: String, CodingKey {
        case domains
        case facetClusters = "facet_clusters"
    }
}

struct FacetCluster: Codable {
    let require: [FacetRequirement]
}

struct FacetRequirement: Codable {
    let facet: String
    let bucket: Bucket
}

enum Bucket: String, Codable {
    case low = "Low"
    case medium = "Medium"
    case high = "High"
}
