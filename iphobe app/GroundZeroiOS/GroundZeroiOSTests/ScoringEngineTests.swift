import XCTest
@testable import GroundZeroiOS

final class ScoringEngineTests: XCTestCase {
    private let engine = ScoringEngine()

    func testBucketBoundaries() {
        XCTAssertEqual(engine.bucketize(0), .low)
        XCTAssertEqual(engine.bucketize(34), .medium)
        XCTAssertEqual(engine.bucketize(66), .medium)
        XCTAssertEqual(engine.bucketize(67), .high)
    }

    func testArchetypeSelectionPicksBestMatch() {
        let rules = [
            ArchetypeRule(id: "alpha", rules: RuleDefinition(domains: ["O": .high], facetClusters: nil)),
            ArchetypeRule(id: "beta", rules: RuleDefinition(domains: ["C": .high], facetClusters: nil))
        ]
        let winner = engine.selectArchetype(rules: rules, buckets: ["C": .high, "O": .low])
        XCTAssertEqual(winner, "Beta")
    }
}
