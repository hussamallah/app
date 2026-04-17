import Foundation

struct DecodedAnswerRun {
    let bankVersion: String
    let facetOutcomes: [Int]
    let scores: [String: [String: Double]]
    let archetypeID: String
}
