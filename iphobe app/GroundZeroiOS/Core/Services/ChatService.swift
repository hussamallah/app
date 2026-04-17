import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: UUID
    let role: String
    let content: String

    init(id: UUID = UUID(), role: String, content: String) {
        self.id = id
        self.role = role
        self.content = content
    }
}

protocol ChatService {
    func send(message: String, history: [ChatMessage]) async throws -> ChatMessage
}
