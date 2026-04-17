import Foundation

struct ChatMessage: Codable, Identifiable {
    let id: UUID
    let isUser: Bool
    let content: String
    let timestampMs: Int64

    init(id: UUID = UUID(), isUser: Bool, content: String, timestampMs: Int64 = Int64(Date().timeIntervalSince1970 * 1000)) {
        self.id = id
        self.isUser = isUser
        self.content = content
        self.timestampMs = timestampMs
    }
}

protocol ChatService {
    func send(message: String, history: [ChatMessage]) async throws -> ChatMessage
}
