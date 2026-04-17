import SwiftUI

struct AssessmentView: View {
    @ObservedObject var viewModel: AssessmentViewModel

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text("Ground Zero Assessment")
                    .font(.title2.bold())
                Text(viewModel.progressText)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if let facet = viewModel.currentFacet {
                    Text("\(facet.domain) - \(facet.facet)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text(facet.binaryQuestion)
                        .font(.headline)
                    HStack {
                        Button("Yes") { viewModel.selectBinary("Yes") }
                        Button("No") { viewModel.selectBinary("No") }
                        Button("Yup") { viewModel.submitYup() }
                    }
                    .buttonStyle(.bordered)

                    if let binary = viewModel.pendingBinary, binary != "Yup" {
                        Text(facet.likertQuestion)
                            .font(.subheadline)
                        HStack {
                            ForEach(1...5, id: \.self) { n in
                                Button("\(n)") { viewModel.submitLikert(n) }
                                    .buttonStyle(.borderedProminent)
                            }
                        }
                    }
                } else {
                    Text("Assessment complete. Check Results tab.")
                }

                if let error = viewModel.errorMessage {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Assessment")
        }
    }
}
