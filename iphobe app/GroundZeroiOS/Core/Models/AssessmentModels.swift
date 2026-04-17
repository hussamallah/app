import Foundation

struct AssessmentQuestion: Identifiable, Codable {
    let id: UUID
    let prompt: String
    let options: [AssessmentOption]

    init(id: UUID = UUID(), prompt: String, options: [AssessmentOption]) {
        self.id = id
        self.prompt = prompt
        self.options = options
    }
}

struct AssessmentOption: Identifiable, Codable {
    let id: UUID
    let label: String
    let delta: [String: Int]

    init(id: UUID = UUID(), label: String, delta: [String: Int]) {
        self.id = id
        self.label = label
        self.delta = delta
    }
}

struct AssessmentAnswer: Codable {
    let questionID: UUID
    let optionID: UUID
}
