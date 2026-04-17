import Foundation

struct DomainProfile: Codable {
    let raw: Double
    let pct: Int
    let bucket: String
}

struct GZProfile: Codable {
    let domains: [String: DomainProfile]
    let facets: [String: Double]
    let archetypeId: String
}

struct DomainCompatEntry: Codable {
    let aRaw: Double
    let bRaw: Double
    let delta: Double
    let synergy: String
    let scorePct: Double
}

struct FacetAlignPair: Codable {
    let facet: String
    let a: Double
    let b: Double
}

struct FacetConflictPair: Codable {
    let facet: String
    let a: Double
    let b: Double
}

struct FacetAnalysis: Codable {
    let alignPairs: [FacetAlignPair]
    let conflictPairs: [FacetConflictPair]
}

struct OverallCompat: Codable {
    let scorePct: Int
    let band: String
    let rationale: [String]
}

struct CompatResult: Codable {
    let overall: OverallCompat
    let domains: [String: DomainCompatEntry]
    let facets: FacetAnalysis
}

struct OverrideItem: Codable, Hashable {
    let id: String
    let why: String
}

struct RoutineItem: Codable, Hashable {
    let name: String
    let spec: String
}

struct PrescriptionScenarios: Codable {
    let work: [String]
    let relationship: [String]
}

struct Prescriptions: Codable {
    let overrides: [OverrideItem]
    let routines: [RoutineItem]
    let scenarios: PrescriptionScenarios
}

struct CompatibilityBundle: Codable {
    let compat: CompatResult
    let prescriptions: Prescriptions
    let narrative: String
    let archetypePairing: String
}
