package com.example.groundzero.assessment

import android.content.res.AssetManager
import org.json.JSONArray
import org.json.JSONObject

data class FacetItem(
    val domain: String,
    val facet: String,
    val binId: String,
    val binQ: String,
    val likId: String,
    val likQ: String,
)

data class AssessmentBank(
    val version: String,
    val domainOrder: List<String>,
    val facetList: List<FacetItem>,
)

fun loadBank(assets: AssetManager): AssessmentBank {
    val text = assets.open("bankv1.json").bufferedReader().use { it.readText() }
    val root = JSONObject(text)
    val version = root.optString("version", "1")
    val domainOrder = root.getJSONArray("domain_order").toStringList()
    val domains = root.getJSONObject("domains")
    val items = mutableListOf<FacetItem>()
    for (d in domainOrder) {
        val facetArr = domains.getJSONObject(d).getJSONArray("facets")
        for (j in 0 until facetArr.length()) {
            val s = facetArr.getJSONObject(j)
            val id = s.getString("id")
            val facet = s.getString("facet")
            items.add(
                FacetItem(
                    domain = d,
                    facet = facet,
                    binId = "$id.bin",
                    binQ = s.getString("binary_question"),
                    likId = "$id.lik",
                    likQ = s.getString("likert_question"),
                ),
            )
        }
    }
    return AssessmentBank(version = version, domainOrder = domainOrder, facetList = items)
}

data class ArchRuleArchetype(
    val id: String,
    val rules: JSONObject,
)

data class ArchRulesFile(
    val archetypes: List<ArchRuleArchetype>,
    val tieTriadQuestion: String?,
)

fun loadArchRules(assets: AssetManager): ArchRulesFile {
    val text = assets.open("arch_rules.json").bufferedReader().use { it.readText() }
    val root = JSONObject(text)
    val arr = root.getJSONArray("archetypes")
    val list = mutableListOf<ArchRuleArchetype>()
    for (i in 0 until arr.length()) {
        val o = arr.getJSONObject(i)
        list.add(ArchRuleArchetype(id = o.getString("id"), rules = o.getJSONObject("rules")))
    }
    val triad = root.optJSONObject("tie_layer")
        ?.optJSONObject("fallbacks")
        ?.optString("triad_question")
        ?.takeIf { it.isNotBlank() }
    return ArchRulesFile(archetypes = list, tieTriadQuestion = triad)
}

fun JSONArray.toStringList(): List<String> = (0 until length()).map { getString(it) }
