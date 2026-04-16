package com.example.groundzero.persistence

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

private const val PREFS_NAME = "gz_assessment"
private const val KEY_RUN_JSON = "saved_run_json"

data class GzSavedRun(
    val bankVersion: String,
    val domainOrder: List<String>,
    val scores: Map<String, Map<String, Double>>,
    val archetypeId: String?,
)

object GzSavedRunStore {

    fun save(
        context: Context,
        bankVersion: String,
        domainOrder: List<String>,
        scores: Map<String, Map<String, Double>>,
        archetypeId: String?,
    ) {
        val root = JSONObject()
        root.put("bankVersion", bankVersion)
        root.put("domainOrder", JSONArray(domainOrder))
        if (archetypeId != null) {
            root.put("archetypeId", archetypeId)
        } else {
            root.put("archetypeId", JSONObject.NULL)
        }
        val scoresObj = JSONObject()
        for (d in domainOrder) {
            val facetMap = scores[d] ?: continue
            val o = JSONObject()
            facetMap.forEach { (k, v) -> o.put(k, v) }
            scoresObj.put(d, o)
        }
        root.put("scores", scoresObj)
        prefs(context).edit().putString(KEY_RUN_JSON, root.toString()).apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().remove(KEY_RUN_JSON).apply()
    }

    /**
     * Returns a saved run only if it matches the current bank [version] and [domainOrder]
     * (same ordered domains), so UI and JSON export stay consistent with the loaded bank.
     */
    fun loadCompatible(
        context: Context,
        bankVersion: String,
        domainOrder: List<String>,
    ): GzSavedRun? {
        val raw = prefs(context).getString(KEY_RUN_JSON, null)?.trim().orEmpty()
        if (raw.isEmpty()) return null
        return runCatching {
            val root = JSONObject(raw)
            if (root.optString("bankVersion") != bankVersion) return null
            val orderArr = root.getJSONArray("domainOrder")
            val loadedOrder = buildList {
                for (i in 0 until orderArr.length()) {
                    add(orderArr.getString(i))
                }
            }
            if (loadedOrder != domainOrder) return null
            val archetypeId = when {
                !root.has("archetypeId") || root.isNull("archetypeId") -> null
                else -> root.optString("archetypeId").takeIf { it.isNotBlank() }
            }
            val scoresObj = root.getJSONObject("scores")
            val scores = linkedMapOf<String, Map<String, Double>>()
            for (d in domainOrder) {
                if (!scoresObj.has(d)) {
                    scores[d] = emptyMap()
                    continue
                }
                val fo = scoresObj.getJSONObject(d)
                val inner = linkedMapOf<String, Double>()
                val keys = fo.keys()
                while (keys.hasNext()) {
                    val k = keys.next()
                    inner[k] = fo.getDouble(k)
                }
                scores[d] = inner
            }
            GzSavedRun(
                bankVersion = bankVersion,
                domainOrder = domainOrder,
                scores = scores,
                archetypeId = archetypeId,
            )
        }.getOrNull()
    }

    private fun prefs(context: Context) =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
}
