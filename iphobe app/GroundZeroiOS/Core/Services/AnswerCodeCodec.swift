import Foundation

enum AnswerCodeCodecError: Error {
    case invalidData(String)
}

enum AnswerCodeCodec {
    private static let magic = "GZAC"
    private static let formatVersion: UInt8 = 1

    static func buildScoresFromFacetOutcomes(bank: AssessmentBank, facetOutcomes: [Int]) -> [String: [String: Double]] {
        precondition(facetOutcomes.count == bank.facetList.count, "facet count mismatch")
        var scores: [String: [String: Double]] = [:]
        for domain in bank.domainOrder {
            scores[domain] = [:]
        }
        for (i, item) in bank.facetList.enumerated() {
            FacetOutcomeCode.applyToScores(item: item, code: facetOutcomes[i]) { d, key, value in
                var inner = scores[d] ?? [:]
                inner[key] = value
                scores[d] = inner
            }
        }
        return scores
    }

    static func encode(
        bank: AssessmentBank,
        archetypes: [ArchetypeRule],
        facetOutcomes: [Int],
        archPickLeft0Right1: Int?
    ) -> String {
        precondition(facetOutcomes.count == 30, "Need 30 facet outcomes")
        let fifteen = packFacetCodesSimple(facetOutcomes)
        let scores = buildScoresFromFacetOutcomes(bank: bank, facetOutcomes: facetOutcomes)
        let engine = ScoringEngine()
        let ids = engine.selectCandidateIDs(allRules: archetypes, domains: engine.buildDomains(finalScores: scores))
        let archByte: UInt8
        if ids.count >= 2 {
            let pick = archPickLeft0Right1 ?? 0
            precondition(pick == 0 || pick == 1, "pick must be 0 or 1")
            archByte = UInt8(0x80 | pick)
        } else {
            archByte = 0x00
        }
        var body = Data(fifteen)
        body.append(archByte)
        let crc = crc8(body)

        var out = Data(magic.utf8)
        out.append(formatVersion)
        let bankBytes = Data(bank.version.utf8)
        out.append(UInt8(bankBytes.count))
        out.append(bankBytes)
        out.append(body)
        out.append(UInt8(crc))

        return "gzac_" + out.base64EncodedString(options: [.endLineWithLineFeed]).trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
    }

    static func decode(raw: String, bank: AssessmentBank, archetypes: [ArchetypeRule]) throws -> DecodedAnswerRun {
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "gzac_", with: "")
            .replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        guard let bin = Data(base64Encoded: normalized) else {
            throw AnswerCodeCodecError.invalidData("bad base64")
        }
        if bin.count < 23 { throw AnswerCodeCodecError.invalidData("code too short") }
        let magicRead = String(data: bin.prefix(4), encoding: .ascii) ?? ""
        if magicRead != magic { throw AnswerCodeCodecError.invalidData("invalid magic") }
        if bin[4] != formatVersion { throw AnswerCodeCodecError.invalidData("unsupported format version") }
        let bankLen = Int(bin[5])
        if bin.count < (6 + bankLen + 17) { throw AnswerCodeCodecError.invalidData("truncated code") }
        let bankVersion = String(data: bin.subdata(in: 6..<(6 + bankLen)), encoding: .utf8) ?? ""
        if bankVersion != bank.version { throw AnswerCodeCodecError.invalidData("assessment version mismatch") }
        let off = 6 + bankLen
        let fifteen = bin.subdata(in: off..<(off + 15))
        let archByte = Int(bin[off + 15])
        let expected = Int(bin[off + 16])
        let body = bin.subdata(in: off..<(off + 16))
        if crc8(body) != expected { throw AnswerCodeCodecError.invalidData("checksum failed") }
        let facetOutcomes = try unpackFacetCodesSimple(fifteen)
        let scores = buildScoresFromFacetOutcomes(bank: bank, facetOutcomes: facetOutcomes)
        let engine = ScoringEngine()
        let ids = engine.selectCandidateIDs(allRules: archetypes, domains: engine.buildDomains(finalScores: scores))
        let archID: String
        if ids.isEmpty {
            archID = archetypes.first?.id ?? "unknown"
        } else if ids.count == 1 {
            archID = ids[0]
        } else {
            if (archByte & 0x80) == 0 { throw AnswerCodeCodecError.invalidData("missing archetype pick") }
            let pick = archByte & 1
            archID = ids[min(max(pick, 0), ids.count - 1)]
        }
        return DecodedAnswerRun(bankVersion: bankVersion, facetOutcomes: facetOutcomes, scores: scores, archetypeID: archID)
    }

    private static func crc8(_ data: Data) -> Int {
        var crc = 0
        for byte in data {
            crc ^= Int(byte)
            for _ in 0..<8 {
                crc = (crc & 0x80) != 0 ? ((crc << 1) ^ 0x07) : (crc << 1)
                crc &= 0xFF
            }
        }
        return crc
    }

    private static func packFacetCodesSimple(_ codes: [Int]) -> Data {
        precondition(codes.count == 30)
        var out = Data(count: 15)
        var acc = 0
        var bits = 0
        var o = 0
        for code in codes {
            precondition((0...10).contains(code))
            acc = (acc << 4) | (code & 0xF)
            bits += 4
            if bits >= 8 {
                bits -= 8
                out[o] = UInt8((acc >> bits) & 0xFF)
                o += 1
                acc = acc & ((1 << bits) - 1)
            }
        }
        return out
    }

    private static func unpackFacetCodesSimple(_ fifteen: Data) throws -> [Int] {
        if fifteen.count != 15 { throw AnswerCodeCodecError.invalidData("invalid facet bytes") }
        var acc = 0
        var bits = 0
        var i = 0
        var out: [Int] = []
        out.reserveCapacity(30)
        for _ in 0..<30 {
            while bits < 4 {
                acc = (acc << 8) | Int(fifteen[i])
                i += 1
                bits += 8
            }
            bits -= 4
            let code = (acc >> bits) & 0xF
            acc = acc & ((1 << bits) - 1)
            if !(0...10).contains(code) { throw AnswerCodeCodecError.invalidData("invalid facet code") }
            out.append(code)
        }
        return out
    }
}
