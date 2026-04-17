import Foundation

enum GeminiConfig {
    static var apiKey: String {
        (Bundle.main.object(forInfoDictionaryKey: "GEMINI_API_KEY") as? String) ?? ""
    }
    static var model: String {
        (Bundle.main.object(forInfoDictionaryKey: "GEMINI_MODEL") as? String) ?? "gemini-1.5-flash"
    }
}

final class GeminiChatService: ChatService {
    func send(message: String, history: [ChatMessage]) async throws -> ChatMessage {
        if GeminiConfig.apiKey.isEmpty {
            return ChatMessage(isUser: false, content: "Missing Gemini API key. Set GEMINI_API_KEY in Info.plist.")
        }
        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/\(GeminiConfig.model):generateContent?key=\(GeminiConfig.apiKey)"
        guard let endpoint = URL(string: urlString) else {
            return ChatMessage(isUser: false, content: "Invalid Gemini endpoint.")
        }
        let trimmed = history.suffix(24).drop(while: { !$0.isUser })
        if trimmed.isEmpty {
            return ChatMessage(isUser: false, content: "Nothing to send.")
        }
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let contents = trimmed.map { msg in
            [
                "role": msg.isUser ? "user" : "model",
                "parts": [["text": msg.content]],
            ] as [String: Any]
        }
        let payload: [String: Any] = [
            "contents": contents,
            "generationConfig": [
                "maxOutputTokens": 350,
                "temperature": 0.7,
                "topP": 0.9,
            ],
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200...299).contains(http.statusCode) {
            throw NSError(domain: "GeminiChat", code: http.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(http.statusCode)"])
        }
        let root = (try JSONSerialization.jsonObject(with: data)) as? [String: Any]
        let candidates = root?["candidates"] as? [[String: Any]]
        let content = candidates?.first?["content"] as? [String: Any]
        let parts = content?["parts"] as? [[String: Any]]
        let text = ((parts?.first?["text"] as? String) ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { throw NSError(domain: "GeminiChat", code: 0, userInfo: [NSLocalizedDescriptionKey: "Empty model text"]) }
        _ = message
        return ChatMessage(isUser: false, content: text)
    }
}
