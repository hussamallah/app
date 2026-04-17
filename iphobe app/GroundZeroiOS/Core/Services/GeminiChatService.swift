import Foundation

enum GeminiConfig {
    static var endpoint: URL? {
        guard let value = Bundle.main.object(forInfoDictionaryKey: "GEMINI_ENDPOINT") as? String else {
            return nil
        }
        return URL(string: value)
    }
}

final class GeminiChatService: ChatService {
    func send(message: String, history: [ChatMessage]) async throws -> ChatMessage {
        guard let endpoint = GeminiConfig.endpoint else {
            return ChatMessage(role: "assistant", content: "Missing API config. Set GEMINI_ENDPOINT in Info.plist.")
        }

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: Any] = [
            "message": message,
            "history": history.map { ["role": $0.role, "content": $0.content] }
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, _) = try await URLSession.shared.data(for: request)
        let fallback = "I could not parse a reply."
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        let text = (json?["reply"] as? String) ?? fallback
        return ChatMessage(role: "assistant", content: text)
    }
}
