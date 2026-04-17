import Foundation

struct PsychologyEntry: Codable {
    let psychologicalProfile: String
    let origin: String
    let innerConflict: String
    let fieldPresence: String
}

typealias PsychologyPayload = [String: PsychologyEntry]
