import XCTest
@testable import GroundZeroiOS

final class ScoringEngineTests: XCTestCase {
    private let engine = ScoringEngine()

    func testMeanBucketBoundaries() {
        XCTAssertEqual(engine.meanBucket(2.0), .low)
        XCTAssertEqual(engine.meanBucket(3.0), .medium)
        XCTAssertEqual(engine.meanBucket(4.0), .high)
    }

    func testArchetypeSelectionPicksBestMatchByDomainBuckets() {
        let rules = [
            ArchetypeRule(id: "alpha", rules: RuleDefinition(domains: ["O": .high], facetClusters: nil)),
            ArchetypeRule(id: "beta", rules: RuleDefinition(domains: ["C": .high], facetClusters: nil))
        ]
        let scores: [String: [String: Double]] = [
            "O": ["Imagination": 2.0, "Artistic Interests": 2.0, "Emotionality": 2.0, "Adventurousness": 2.0, "Intellect": 2.0, "Liberalism": 2.0],
            "C": ["Self-Efficacy": 4.5, "Orderliness": 4.5, "Dutifulness": 4.5, "Achievement-Striving": 4.5, "Self-Discipline": 4.5, "Cautiousness": 4.5],
        ]
        let winner = engine.selectArchetype(rules: rules, domainScores: scores, pickIndex: 0)
        XCTAssertEqual(winner, "beta")
    }
}
