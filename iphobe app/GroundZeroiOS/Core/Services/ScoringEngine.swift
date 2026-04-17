import Foundation

struct ScoringEngine {
    private let targetValues: [MeanBucket: Double] = [.high: 5.0, .medium: 3.0, .low: 1.0]

    func facetToBucket(_ value: Double) -> MeanBucket {
        if value >= 4.0 { return .high }
        if value <= 2.0 { return .low }
        return .medium
    }

    func meanBucket(_ mean: Double) -> MeanBucket {
        if mean >= 3.75 { return .high }
        if mean <= 2.25 { return .low }
        return .medium
    }

    func buildDomains(finalScores: [String: [String: Double]]) -> [String: DomainState] {
        var out: [String: DomainState] = [:]
        for domain in BigFiveConstants.domainOrder {
            let facets = BigFiveConstants.canonicalFacets(domain)
            let rawValues = facets.map { facet -> Double in
                let key = BigFiveConstants.toCanonicalFacet(domain: domain, facet: facet)
                let v = finalScores[domain]?[key] ?? 3.0
                return min(5.0, max(1.0, v))
            }
            let mean = (rawValues.reduce(0, +) / Double(max(rawValues.count, 1)) * 100).rounded() / 100
            var facetBuckets: [String: MeanBucket] = [:]
            for (idx, f) in facets.enumerated() {
                facetBuckets[f] = facetToBucket(rawValues[idx])
            }
            out[domain] = DomainState(mean: mean, bucket: meanBucket(mean), facet: facetBuckets)
        }
        return out
    }

    func passFacetCluster(_ domain: String, _ cluster: FacetClusterDefinition?, _ domains: [String: DomainState]) -> Bool {
        guard let cluster else { return true }
        if !cluster.require.isEmpty {
            for req in cluster.require {
                guard let b = domains[domain]?.facet[req.facet], b.rawValue == req.bucket.rawValue else {
                    return false
                }
            }
            return true
        }
        if let minHigh = cluster.minHigh, let facets = cluster.facets {
            let count = facets.filter { domains[domain]?.facet[$0] == .high }.count
            return count >= minHigh
        }
        if let anyHigh = cluster.anyHigh, !anyHigh.isEmpty {
            return anyHigh.contains { domains[domain]?.facet[$0] == .high }
        }
        if let anyLow = cluster.anyLow, !anyLow.isEmpty {
            return anyLow.contains { domains[domain]?.facet[$0] == .low }
        }
        return true
    }

    func matchesRules(_ archetype: ArchetypeRule, _ domains: [String: DomainState]) -> Bool {
        for (key, want) in archetype.rules.domains {
            guard let actual = domains[key]?.bucket.rawValue, actual == want.rawValue else {
                return false
            }
        }
        if let clusters = archetype.rules.facetClusters {
            for (key, cluster) in clusters where !passFacetCluster(key, cluster, domains) {
                return false
            }
        }
        return true
    }

    func distance(archetypeID: String, userDomains: [String: DomainState], allRules: [ArchetypeRule]) -> Double {
        guard let domainRules = allRules.first(where: { $0.id == archetypeID })?.rules.domains else {
            return 999.0
        }
        return ["O", "C", "E", "A", "N"].reduce(0.0) { total, d in
            let userVal = userDomains[d]?.mean ?? 3.0
            let target = targetValues[MeanBucket(rawValue: domainRules[d]?.rawValue ?? "") ?? .medium] ?? 3.0
            return total + abs(userVal - target)
        }
    }

    func selectCandidateIDs(allRules: [ArchetypeRule], domains: [String: DomainState]) -> [String] {
        var ids = allRules.filter { matchesRules($0, domains) }.map(\.id)
        if ids.count < 2 {
            let candidates = allRules.map(\.id).filter { !ids.contains($0) }
            let sorted = candidates.sorted { distance(archetypeID: $0, userDomains: domains, allRules: allRules) < distance(archetypeID: $1, userDomains: domains, allRules: allRules) }
            ids += sorted.prefix(2 - ids.count)
        }
        if ids.count > 2 {
            ids = Array(ids.prefix(2))
        }
        return ids
    }

    func selectArchetype(rules: [ArchetypeRule], domainScores: [String: [String: Double]], pickIndex: Int?) -> String {
        let domains = buildDomains(finalScores: domainScores)
        let ids = selectCandidateIDs(allRules: rules, domains: domains)
        if ids.isEmpty { return rules.first?.id ?? "unknown" }
        if ids.count == 1 { return ids[0] }
        let pick = min(max(pickIndex ?? 0, 0), ids.count - 1)
        return ids[pick]
    }

    func mapDomainMeansToBucket(_ domainScores: [String: [String: Double]]) -> [String: Bucket] {
        let domains = buildDomains(finalScores: domainScores)
        var output: [String: Bucket] = [:]
        for (k, v) in domains {
            switch v.bucket {
            case .low: output[k] = .low
            case .medium: output[k] = .medium
            case .high: output[k] = .high
            }
        }
        return output
    }
}
