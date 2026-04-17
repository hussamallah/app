import Foundation

enum CompatibilityEngine {
    private static let domainWeights: [String: Double] = ["O": 1.0, "C": 1.2, "E": 1.2, "A": 1.4, "N": 1.2]
    private static let synergyAlign = 0.4
    private static let synergyComplement = 1.2

    static func calculateDomainCompatScore(aRaw: Double, bRaw: Double) -> Double {
        min(100, max(0, 100.0 - (abs(aRaw - bRaw) / 4.0) * 100.0))
    }

    static func getSynergyLabel(delta: Double, domain: String) -> String {
        let absDelta = abs(delta)
        if domain == "N" && absDelta >= 0.8 && absDelta <= 1.2 { return "Watch" }
        if absDelta <= synergyAlign { return "Align" }
        if absDelta <= synergyComplement { return "Complement" }
        return "Tension"
    }

    private static func analyzeFacetPairs(a: GZProfile, b: GZProfile) -> FacetAnalysis {
        var aligns: [FacetAlignPair] = []
        var conflicts: [FacetConflictPair] = []
        for key in Set(a.facets.keys).union(b.facets.keys) {
            guard let av = a.facets[key], let bv = b.facets[key] else { continue }
            let aHigh = av >= 4.0
            let bHigh = bv >= 4.0
            let aLow = av <= 2.0
            let bLow = bv <= 2.0
            if (aHigh && bHigh) || (aLow && bLow) {
                aligns.append(FacetAlignPair(facet: key, a: av, b: bv))
            } else if (aHigh && bLow) || (aLow && bHigh) {
                conflicts.append(FacetConflictPair(facet: key, a: av, b: bv))
            }
        }
        aligns.sort { min($0.a, $0.b) > min($1.a, $1.b) }
        conflicts.sort { abs($0.a - $0.b) > abs($1.a - $1.b) }
        return FacetAnalysis(alignPairs: aligns, conflictPairs: conflicts)
    }

    private static func calculateOverallScore(_ entries: [String: DomainCompatEntry]) -> (Int, String) {
        var weighted = 0.0
        var total = 0.0
        for (domain, e) in entries {
            let w = domainWeights[domain] ?? 1.0
            weighted += e.scorePct * w
            total += w
        }
        let score = Int((weighted / max(total, 1.0)).rounded())
        let band = score >= 80 ? "Strong" : (score >= 60 ? "Moderate" : "Caution")
        return (score, band)
    }

    private static func buildRationale(_ entries: [String: DomainCompatEntry]) -> [String] {
        let sorted = entries.sorted { $0.value.scorePct > $1.value.scorePct }
        var out: [String] = []
        for item in sorted.filter({ ["Align", "Complement"].contains($0.value.synergy) }).prefix(2) {
            let label = BigFiveConstants.domainLabels[item.key] ?? item.key
            out.append(item.value.synergy == "Align" ? "High \(label) alignment" : "Complementary \(label)")
        }
        if let tension = sorted.last(where: { $0.value.synergy == "Tension" }) {
            out.append("Manage \((BigFiveConstants.domainLabels[tension.key] ?? tension.key)) mismatch")
        } else if let watch = sorted.first(where: { $0.value.synergy == "Watch" }) {
            out.append("Watch \((BigFiveConstants.domainLabels[watch.key] ?? watch.key)) reactivity gap")
        }
        return out
    }

    private static func buildNarrative(_ compat: CompatResult) -> String {
        let strongest = compat.domains.max(by: { $0.value.scorePct < $1.value.scorePct })?.key ?? "core traits"
        let strongestLabel = BigFiveConstants.domainLabels[strongest] ?? strongest
        let intro: String
        switch compat.overall.band {
        case "Strong":
            intro = "Your profiles show a strong natural alignment - \(compat.overall.scorePct)% overall - with the deepest bond rooted in shared \(strongestLabel)."
        case "Moderate":
            intro = "Your profiles show moderate compatibility at \(compat.overall.scorePct)%, with meaningful common ground in \(strongestLabel) and clear room to grow through intentional communication."
        default:
            intro = "Your profiles show \(compat.overall.scorePct)% overall compatibility. Real differences exist, and named and managed, they can become complementary."
        }
        if let topConflict = compat.facets.conflictPairs.first {
            let facet = topConflict.facet.split(separator: ":").last.map(String.init) ?? "trait"
            return intro + " At the trait level, \(facet.lowercased()) shows the starkest contrast."
        }
        return intro
    }

    static func computeCompatibility(a: GZProfile, b: GZProfile) -> CompatibilityBundle {
        let domainOrder = ["O", "C", "E", "A", "N"]
        var entries: [String: DomainCompatEntry] = [:]
        for domain in domainOrder {
            guard let ad = a.domains[domain], let bd = b.domains[domain] else { continue }
            let delta = bd.raw - ad.raw
            entries[domain] = DomainCompatEntry(aRaw: ad.raw, bRaw: bd.raw, delta: delta, synergy: getSynergyLabel(delta: delta, domain: domain), scorePct: calculateDomainCompatScore(aRaw: ad.raw, bRaw: bd.raw))
        }
        let (score, band) = calculateOverallScore(entries)
        let compat = CompatResult(overall: OverallCompat(scorePct: score, band: band, rationale: buildRationale(entries)), domains: entries, facets: analyzeFacetPairs(a: a, b: b))
        return CompatibilityBundle(
            compat: compat,
            prescriptions: Prescriptions(overrides: [], routines: [], scenarios: PrescriptionScenarios(work: [], relationship: [])),
            narrative: buildNarrative(compat),
            archetypePairing: "\(a.archetypeId.capitalized) and \(b.archetypeId.capitalized) bring different instincts into one system."
        )
    }
}
