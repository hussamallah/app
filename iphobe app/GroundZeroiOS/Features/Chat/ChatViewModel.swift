import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var sessions: [ChatSession] = []
    @Published var sessionID = ChatSession.newID()
    @Published var draft = ""
    @Published var isSending = false
    @Published var error: String?

    private let service: ChatService
    private let storageKey = "gz_ai_chats.sessions_json"

    init(service: ChatService = GeminiChatService()) {
        self.service = service
        restore()
        if sessions.isEmpty {
            sessions = []
        }
    }

    func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }
        draft = ""

        let userMessage = ChatMessage(isUser: true, content: text)
        messages.append(userMessage)
        isSending = true
        error = nil

        Task {
            do {
                let reply = try await service.send(message: text, history: messages)
                messages.append(reply)
                saveSession()
            } catch {
                self.error = error.localizedDescription
            }
            isSending = false
        }
    }

    func clear() {
        messages = []
        saveSession()
    }

    func loadSession(_ session: ChatSession) {
        sessionID = session.id
        messages = session.messages
    }

    func newSession() {
        saveSession()
        sessionID = ChatSession.newID()
        messages = []
    }

    private func saveSession() {
        guard !messages.isEmpty else { return }
        var all = sessions
        let updated = ChatSession(id: sessionID, createdMs: messages.first?.timestampMs ?? Int64(Date().timeIntervalSince1970 * 1000), messages: messages)
        if let idx = all.firstIndex(where: { $0.id == sessionID }) {
            all[idx] = updated
        } else {
            all.insert(updated, at: 0)
        }
        sessions = Array(all.sorted { $0.lastMs > $1.lastMs }.prefix(50))
        persist()
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(sessions) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func restore() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([ChatSession].self, from: data) else {
            return
        }
        sessions = decoded
        if let first = decoded.first {
            sessionID = first.id
            messages = first.messages
        }
    }
}

struct ChatSession: Codable, Identifiable {
    let id: String
    let createdMs: Int64
    let messages: [ChatMessage]

    var title: String {
        messages.first(where: { $0.isUser })?.content.prefix(64).description ?? "New conversation"
    }
    var lastMs: Int64 {
        messages.last?.timestampMs ?? createdMs
    }

    static func newID() -> String {
        "ai_\(Int64(Date().timeIntervalSince1970 * 1000))"
    }
}
