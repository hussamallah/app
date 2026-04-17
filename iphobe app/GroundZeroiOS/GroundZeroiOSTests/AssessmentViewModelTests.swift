import XCTest
@testable import GroundZeroiOS

@MainActor
final class AssessmentViewModelTests: XCTestCase {
    func testLikertSubmissionAdvancesFacet() {
        let store = RunStore()
        let viewModel = AssessmentViewModel(runStore: store)
        let initialIndex = viewModel.currentIndex
        viewModel.selectBinary("Yes")
        viewModel.submitLikert(3)

        XCTAssertEqual(viewModel.currentIndex, initialIndex + 1)
    }
}
