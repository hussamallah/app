package com.example.groundzero.assessment

import android.content.res.AssetManager
import org.json.JSONObject

data class ArchetypeAtlasEntry(
    val psychologicalProfile: String,
    val origin: String,
    val innerConflict: String,
    val fieldPresence: String,
)

fun loadArchetypesAtlas(assets: AssetManager): Map<String, ArchetypeAtlasEntry> {
    val text = assets.open("archetypes_atlas.json").bufferedReader().use { it.readText() }
    val root = JSONObject(text)
    val out = linkedMapOf<String, ArchetypeAtlasEntry>()
    val keys = root.keys()
    while (keys.hasNext()) {
        val rawKey = keys.next()
        val obj = root.optJSONObject(rawKey) ?: continue
        val canonical = canonicalArchetypeKey(rawKey)
        if (canonical.isBlank()) continue
        val entry = ArchetypeAtlasEntry(
            psychologicalProfile = obj.optString("psychologicalProfile").trim(),
            origin = obj.optString("origin").trim(),
            innerConflict = obj.optString("innerConflict").trim(),
            fieldPresence = obj.optString("fieldPresence").trim(),
        )
        out[canonical] = entry
    }
    return out
}

private fun canonicalArchetypeKey(raw: String): String {
    return raw.trim().lowercase().replace(" ", "").replace("-", "")
}
