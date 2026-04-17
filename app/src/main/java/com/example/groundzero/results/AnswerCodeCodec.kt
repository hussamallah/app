package com.example.groundzero.results

import android.util.Base64
import com.example.groundzero.assessment.ArchRuleArchetype
import com.example.groundzero.assessment.ArchRulesEngine
import com.example.groundzero.assessment.AssessmentBank
import java.io.ByteArrayOutputStream
import java.nio.charset.StandardCharsets

private const val MAGIC = "GZAC"
private const val FORMAT_VERSION: Byte = 1

/** CRC-8/MAXIM (poly 0x07, init 0). */
private fun crc8(data: ByteArray): Int {
    var crc = 0
    for (b in data) {
        crc = crc xor (b.toInt() and 0xFF)
        repeat(8) {
            crc = if (crc and 0x80 != 0) (crc shl 1) xor 0x07 else crc shl 1
            crc = crc and 0xFF
        }
    }
    return crc
}

/** Pack 30 facet codes (0–10, 4 bits each) into 15 bytes — MSB-first bit stream. */
private fun packFacetCodesSimple(codes: List<Int>): ByteArray {
    require(codes.size == 30)
    val out = ByteArray(15)
    var acc = 0
    var bits = 0
    var o = 0
    for (code in codes) {
        require(code in 0..10)
        acc = (acc shl 4) or (code and 0xF)
        bits += 4
        if (bits >= 8) {
            bits -= 8
            out[o++] = ((acc shr bits) and 0xFF).toByte()
            acc = acc and ((1 shl bits) - 1)
        }
    }
    require(o == 15 && bits == 0)
    return out
}

private fun unpackFacetCodesSimple(fifteen: ByteArray): List<Int> {
    require(fifteen.size == 15)
    var acc = 0
    var bits = 0
    var i = 0
    val out = ArrayList<Int>(30)
    repeat(30) {
        while (bits < 4) {
            require(i < fifteen.size)
            acc = (acc shl 8) or (fifteen[i++].toInt() and 0xFF)
            bits += 8
        }
        bits -= 4
        val code = (acc shr bits) and 0xF
        acc = acc and ((1 shl bits) - 1)
        require(code in 0..10) { "invalid facet code $code" }
        out.add(code)
    }
    return out
}

fun buildScoresFromFacetOutcomes(
    bank: AssessmentBank,
    facetOutcomes: List<Int>,
): Map<String, Map<String, Double>> {
    require(facetOutcomes.size == bank.facetList.size) { "facet count mismatch" }
    val scores = linkedMapOf<String, MutableMap<String, Double>>()
    bank.domainOrder.forEach { scores[it] = linkedMapOf() }
    for ((i, item) in bank.facetList.withIndex()) {
        FacetOutcomeCode.applyToScores(item, facetOutcomes[i]) { d, key, v ->
            scores.getOrPut(d) { linkedMapOf() }[key] = v
        }
    }
    return scores.mapValues { it.value.toMap() }
}

private fun resolveArchetypeId(
    archetypes: List<ArchRuleArchetype>,
    scores: Map<String, Map<String, Double>>,
    archByte: Int,
): String {
    val domains = ArchRulesEngine.buildDomains(scores)
    val ids = ArchRulesEngine.selectCandidateIds(archetypes, domains)
    return when {
        ids.isEmpty() -> archetypes.firstOrNull()?.id ?: "unknown"
        ids.size == 1 -> ids[0]
        else -> {
            require(archByte and 0x80 != 0) { "missing archetype pick for two-way resolution" }
            val pick = archByte and 1
            ids[pick.coerceIn(0, ids.lastIndex)]
        }
    }
}

data class DecodedAnswerRun(
    val bankVersion: String,
    val facetOutcomes: List<Int>,
    val scores: Map<String, Map<String, Double>>,
    val archetypeId: String,
)

object AnswerCodeCodec {

    /**
     * URL-safe Base64 payload with prefix `gzac_`. [facetOutcomes]: 30 ints 0–10.
     * [archPickLeft0Right1] required when [ArchRulesEngine.selectCandidateIds] yields two ids.
     */
    fun encode(
        bank: AssessmentBank,
        archetypes: List<ArchRuleArchetype>,
        facetOutcomes: List<Int>,
        archPickLeft0Right1: Int?,
    ): String {
        require(facetOutcomes.size == 30) { "Need 30 facet outcomes" }
        val fifteen = packFacetCodesSimple(facetOutcomes)
        val scores = buildScoresFromFacetOutcomes(bank, facetOutcomes)
        val domains = ArchRulesEngine.buildDomains(scores)
        val ids = ArchRulesEngine.selectCandidateIds(archetypes, domains)
        val archByte = when {
            ids.size >= 2 -> {
                val pick = archPickLeft0Right1
                    ?: throw IllegalArgumentException("archPickLeft0Right1 required when two candidates")
                require(pick == 0 || pick == 1)
                0x80 or pick
            }
            else -> 0x00
        }
        val body = fifteen + archByte.toByte()
        val crc = crc8(body)
        val bankBytes = bank.version.toByteArray(StandardCharsets.UTF_8)
        require(bankBytes.size <= 255) { "bank version string too long" }
        val out = ByteArrayOutputStream()
        out.write(MAGIC.toByteArray(StandardCharsets.US_ASCII))
        out.write(FORMAT_VERSION.toInt())
        out.write(bankBytes.size)
        out.write(bankBytes)
        out.write(body)
        out.write(crc)
        val encoded = Base64.encodeToString(out.toByteArray(), Base64.URL_SAFE or Base64.NO_WRAP)
        return "gzac_$encoded"
    }

    fun decode(
        raw: String,
        bank: AssessmentBank,
        archetypes: List<ArchRuleArchetype>,
    ): DecodedAnswerRun {
        val s = raw.trim().removePrefix("gzac_").trim()
        val bin = Base64.decode(s, Base64.URL_SAFE)
        require(bin.size >= 4 + 1 + 1 + 15 + 1 + 1) { "code too short" }
        val magic = String(bin, 0, 4, StandardCharsets.US_ASCII)
        require(magic == MAGIC) { "invalid magic" }
        require(bin[4] == FORMAT_VERSION) { "unsupported format version" }
        val bankLen = bin[5].toInt() and 0xFF
        require(bin.size >= 6 + bankLen + 15 + 1 + 1) { "truncated code" }
        val bankVersion = String(bin, 6, bankLen, StandardCharsets.UTF_8)
        require(bankVersion == bank.version) { "This code was made with a different assessment version." }
        val off = 6 + bankLen
        val fifteen = bin.copyOfRange(off, off + 15)
        val archByte = bin[off + 15].toInt() and 0xFF
        val crcExpected = bin[off + 16].toInt() and 0xFF
        val body = bin.copyOfRange(off, off + 16)
        val crcActual = crc8(body)
        require(crcActual == crcExpected) { "checksum failed — code may be corrupted" }
        val facetOutcomes = unpackFacetCodesSimple(fifteen)
        val scores = buildScoresFromFacetOutcomes(bank, facetOutcomes)
        val archId = resolveArchetypeId(archetypes, scores, archByte)
        return DecodedAnswerRun(
            bankVersion = bankVersion,
            facetOutcomes = facetOutcomes,
            scores = scores,
            archetypeId = archId,
        )
    }
}

private operator fun ByteArray.plus(b: Byte): ByteArray {
    val out = copyOf(size + 1)
    out[size] = b
    return out
}
