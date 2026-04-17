import XCTest
@testable import GroundZeroiOS

@MainActor
final class AssessmentViewModelTests: XCTestCase {
    func testNextAdvancesWhenOptionSelected() {
        let store = RunStore()
        let viewModel = AssessmentViewModel(runStore: store)
        let initialIndex = viewModel.currentIndex
        let firstOptionID = viewModel.currentQuestion?.options.first?.id

        XCTAssertNotNil(firstOptionID)
        viewModel.selectOption(firstOptionID!)
        viewModel.goNext()

        XCTAssertEqual(viewModel.currentIndex, initialIndex + 1)
    }
}
