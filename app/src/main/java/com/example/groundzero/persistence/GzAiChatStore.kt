package com.example.groundzero.persistence

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class AiMessage(
    val isUser: Boolean,
    val text: String,
    val timestampMs: Long = System.currentTimeMillis(),
)

data class AiSession(
    val id: String,
    val createdMs: Long,
    val messages: List<AiMessage>,
) {
    val title: String
        get() = messages.firstOrNull { it.isUser }?.text?.take(64).orEmpty().ifBlank { "New conversation" }
    val lastMs: Long get() = messages.lastOrNull()?.timestampMs ?: createdMs
    val messageCount: Int get() = messages.size
}

object GzAiChatStore {
    private const val PREFS_NAME = "gz_ai_chats"
    private const val KEY_SESSIONS = "sessions_json"
    private const val MAX_SESSIONS = 50

    fun newSessionId(): String = "ai_${System.currentTimeMillis()}"

    fun saveSession(context: Context, session: AiSession) {
        if (session.messages.isEmpty()) return
        val all = loadAllSessions(context).toMutableList()
        val idx = all.indexOfFirst { it.id == session.id }
        if (idx >= 0) all[idx] = session else all.add(0, session)
        val trimmed = all.sortedByDescending { it.lastMs }.take(MAX_SESSIONS)
        val arr = JSONArray()
        for (s in trimmed) arr.put(sessionToJson(s))
        prefs(context).edit().putString(KEY_SESSIONS, arr.toString()).apply()
    }

    fun loadAllSessions(context: Context): List<AiSession> {
        val raw = prefs(context).getString(KEY_SESSIONS, null) ?: return emptyList()
        return runCatching {
            val arr = JSONArray(raw)
            buildList { for (i in 0 until arr.length()) add(sessionFromJson(arr.getJSONObject(i))) }
        }.getOrElse { emptyList() }
    }

    fun deleteSession(context: Context, id: String) {
        val updated = loadAllSessions(context).filter { it.id != id }
        val arr = JSONArray()
        for (s in updated) arr.put(sessionToJson(s))
        prefs(context).edit().putString(KEY_SESSIONS, arr.toString()).apply()
    }

    private fun sessionToJson(s: AiSession): JSONObject {
        val msgs = JSONArray()
        for (m in s.messages) {
            msgs.put(
                JSONObject()
                    .put("isUser", m.isUser)
                    .put("text", m.text)
                    .put("ts", m.timestampMs),
            )
        }
        return JSONObject()
            .put("id", s.id)
            .put("createdMs", s.createdMs)
            .put("messages", msgs)
    }

    private fun sessionFromJson(obj: JSONObject): AiSession {
        val id = obj.getString("id")
        val createdMs = obj.getLong("createdMs")
        val msArr = obj.optJSONArray("messages") ?: JSONArray()
        val messages = buildList {
            for (i in 0 until msArr.length()) {
                val m = msArr.getJSONObject(i)
                add(AiMessage(m.getBoolean("isUser"), m.getString("text"), m.optLong("ts", createdMs)))
            }
        }
        return AiSession(id, createdMs, messages)
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
