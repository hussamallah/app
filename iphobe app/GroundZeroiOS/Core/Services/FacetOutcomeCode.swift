import Foundation

enum FacetOutcomeCode {
    static let yup = 10
    private static let likertMap: [Int: Double] = [5: 1.0, 4: 2.0, 3: 3.0, 2: 4.0, 1: 5.0]

    static func fromNoLikert(_ likert1to5: Int) -> Int {
        min(max(likert1to5 - 1, 0), 4)
    }

    static func fromYesLikert(_ likert1to5: Int) -> Int {
        5 + min(max(likert1to5 - 1, 0), 4)
    }

    static func toRawScore(_ code: Int) -> Double {
        precondition((0...10).contains(code), "facet code must be 0..10")
        if code == yup { return 5.0 }
        if code < 5 {
            let likert = code + 1
            return likertMap[likert] ?? 3.0
        }
        let likert = code - 5 + 1
        let base = likertMap[likert] ?? 3.0
        return min(base + 0.5, 5.0)
    }

    static func applyToScores(item: FacetItem, code: Int, put: (String, String, Double) -> Void) {
        let key = BigFiveConstants.toCanonicalFacet(domain: item.domain, facet: item.facet)
        put(item.domain, key, toRawScore(code))
    }
}
