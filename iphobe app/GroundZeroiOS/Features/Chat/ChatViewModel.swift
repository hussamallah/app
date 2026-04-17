import Foundation

@MainActor
final class ChatViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var draft = ""
    @Published var isSending = false
    @Published var error: String?

    private let service: ChatService
    private let storageKey = "gz.chat.history"

    init(service: ChatService = GeminiChatService()) {
        self.service = service
        restore()
    }

    func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }
        draft = ""

        let userMessage = ChatMessage(role: "user", content: text)
        messages.append(userMessage)
        isSending = true
        error = nil

        Task {
            do {
                let reply = try await service.send(message: text, history: messages)
                messages.append(reply)
                persist()
            } catch {
                self.error = error.localizedDescription
            }
            isSending = false
        }
    }

    func clear() {
        messages = []
        persist()
    }

    private func persist() {
        if let data = try? JSONEncoder().encode(messages) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private func restore() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([ChatMessage].self, from: data) else {
            return
        }
        messages = decoded
    }
}
