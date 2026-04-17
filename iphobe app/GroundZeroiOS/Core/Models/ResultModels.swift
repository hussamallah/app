import Foundation

struct RunResult: Codable, Identifiable {
    let id: UUID
    let createdAt: Date
    let topArchetype: String
    let scoredDomains: [String: Bucket]
    let psychology: PsychologyEntry?
}

struct RunDraft: Codable {
    var answers: [AssessmentAnswer]
    var domainScores: [String: Int]
}
