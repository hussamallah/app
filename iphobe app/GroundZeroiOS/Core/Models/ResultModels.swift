import Foundation

struct RunResult: Codable, Identifiable {
    let id: UUID
    let createdAt: Date
    let topArchetype: String
    let scoredDomains: [String: Bucket]
    let bankVersion: String
    let scores: [String: [String: Double]]
    let facetOutcomes: [Int]
    let archPickLeft0Right1: Int?
    let psychology: PsychologyEntry?
    let answerCode: String?
    let compatibility: CompatibilityBundle?
}

struct RunDraft: Codable {
    var currentFacetIndex: Int
    var pendingBinary: String?
    var facetOutcomes: [Int]
}
