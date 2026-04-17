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

                if let question = viewModel.currentQuestion {
                    Text(question.prompt)
                        .font(.headline)
                    ForEach(question.options) { option in
                        Button {
                            viewModel.selectOption(option.id)
                        } label: {
                            HStack {
                                Text(option.label)
                                Spacer()
                                if viewModel.selectedOptionID == option.id {
                                    Image(systemName: "checkmark.circle.fill")
                                }
                            }
                            .padding()
                            .background(.thinMaterial)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                        .buttonStyle(.plain)
                    }

                    Button("Next") {
                        viewModel.goNext()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.selectedOptionID == nil)
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
