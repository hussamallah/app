package com.example.groundzero.ai

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class ChatTurn(val isUser: Boolean, val text: String)

object GeminiChatClient {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(90, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    suspend fun generateReply(
        apiKey: String,
        model: String,
        turns: List<ChatTurn>,
        profileContext: String,
    ): String = withContext(Dispatchers.IO) {
        if (apiKey.isBlank()) throw IOException("Missing Gemini API key")
        require(turns.isNotEmpty() && turns.last().isUser) { "Conversation must end with a user message" }

        var trimmed = if (turns.size > 24) turns.takeLast(24) else turns.toList()
        while (trimmed.isNotEmpty() && !trimmed.first().isUser) {
            trimmed = trimmed.drop(1)
        }
        if (trimmed.isEmpty()) throw IOException("Nothing to send")

        val contents = JSONArray()
        for (turn in trimmed) {
            contents.put(
                JSONObject()
                    .put("role", if (turn.isUser) "user" else "model")
                    .put("parts", JSONArray().put(JSONObject().put("text", turn.text))),
            )
        }

        val instruction = buildString {
            append(GroundZeroAiConfig.SYSTEM_RULES)
            append("\n\nCurrent user profile context:\n")
            append(profileContext.ifBlank { "No profile context available." })
        }

        val body = JSONObject()
            .put("contents", contents)
            .put(
                "generationConfig",
                JSONObject()
                    .put("maxOutputTokens", 350)
                    .put("temperature", 0.7)
                    .put("topP", 0.9),
            )
            .put(
                "systemInstruction",
                JSONObject().put(
                    "parts",
                    JSONArray().put(JSONObject().put("text", instruction)),
                ),
            )

        val url =
            "https://generativelanguage.googleapis.com/v1beta/models/$model:generateContent?key=$apiKey"
        val req = Request.Builder()
            .url(url)
            .post(body.toString().toRequestBody(jsonMedia))
            .build()

        http.newCall(req).execute().use { resp ->
            val raw = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                val msg = runCatching {
                    JSONObject(raw).getJSONObject("error").optString("message")
                }.getOrNull().orEmpty().ifBlank { raw.ifBlank { "HTTP ${resp.code}" } }
                throw IOException(msg)
            }
            val root = JSONObject(raw)
            if (root.has("error")) {
                throw IOException(root.getJSONObject("error").optString("message", "API error"))
            }
            val candidates = root.optJSONArray("candidates")
                ?: throw IOException("No candidates in response")
            if (candidates.length() == 0) {
                throw IOException("Empty candidates (content may have been blocked)")
            }
            val content = candidates.getJSONObject(0).optJSONObject("content")
                ?: throw IOException("No content in candidate")
            val parts = content.optJSONArray("parts") ?: throw IOException("No parts in content")
            val text = parts.getJSONObject(0).optString("text").trim()
            if (text.isEmpty()) throw IOException("Empty model text")
            return@withContext text
        }
    }
}
