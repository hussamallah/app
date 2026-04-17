import Foundation

struct ScoringEngine {
    func bucketize(_ score: Int) -> Bucket {
        switch score {
        case ..<34: return .low
        case 34...66: return .medium
        default: return .high
        }
    }

    func mapScoresToBuckets(_ domainScores: [String: Int]) -> [String: Bucket] {
        domainScores.mapValues { bucketize($0) }
    }

    func selectArchetype(rules: [ArchetypeRule], buckets: [String: Bucket]) -> String {
        var bestID = "Unclassified"
        var bestScore = Int.min

        for item in rules {
            var score = 0
            for (domain, expectedBucket) in item.rules.domains where buckets[domain] == expectedBucket {
                _ = domain
                score += 1
            }
            if score > bestScore {
                bestID = item.id
                bestScore = score
            }
        }
        return bestID.capitalized
    }
}
