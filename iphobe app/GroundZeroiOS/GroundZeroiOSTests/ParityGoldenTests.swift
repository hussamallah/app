import XCTest
@testable import GroundZeroiOS

final class ParityGoldenTests: XCTestCase {
    func testAnswerCodecRoundTripForAllYupVector() throws {
        let repo = ArchetypeRepository()
        let bank = try repo.loadBank()
        let rules = try repo.loadRules().archetypes
        let vector = Array(repeating: 10, count: 30)
        let code = AnswerCodeCodec.encode(bank: bank, archetypes: rules, facetOutcomes: vector, archPickLeft0Right1: 0)
        let decoded = try AnswerCodeCodec.decode(raw: code, bank: bank, archetypes: rules)
        XCTAssertEqual(decoded.facetOutcomes, vector)
    }

    func testCompatibilityDomainScoreFormula() {
        XCTAssertEqual(CompatibilityEngine.calculateDomainCompatScore(aRaw: 5.0, bRaw: 5.0), 100.0, accuracy: 0.0001)
        XCTAssertEqual(CompatibilityEngine.calculateDomainCompatScore(aRaw: 1.0, bRaw: 5.0), 0.0, accuracy: 0.0001)
    }
}
