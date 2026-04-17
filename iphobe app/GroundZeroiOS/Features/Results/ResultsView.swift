import SwiftUI

struct ResultsView: View {
    @ObservedObject var viewModel: ResultsViewModel
    @State private var shareText: String?

    var body: some View {
        NavigationStack {
            List {
                if viewModel.runs.isEmpty {
                    Text("No completed runs yet. Finish an assessment first.")
                } else {
                    ForEach(viewModel.runs) { run in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(run.topArchetype)
                                .font(.headline)
                            Text(run.createdAt.formatted())
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Button("Share Report") {
                                shareText = viewModel.reportText(for: run)
                            }
                            .buttonStyle(.bordered)
                        }
                        .onTapGesture {
                            viewModel.select(run)
                        }
                    }
                }
            }
            .navigationTitle("Results")
            .sheet(item: Binding(
                get: { shareText.map { SharePayload(text: $0) } },
                set: { payload in shareText = payload?.text }
            )) { payload in
                ShareSheet(items: [payload.text])
            }
            .safeAreaInset(edge: .bottom) {
                if let selected = viewModel.selectedRun {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Selected: \(selected.topArchetype)")
                            .font(.headline)
                        if let profile = selected.psychology {
                            Text(profile.psychologicalProfile)
                                .font(.footnote)
                        }
                    }
                    .padding()
                    .background(.ultraThinMaterial)
                }
            }
        }
    }
}

private struct SharePayload: Identifiable {
    let id = UUID()
    let text: String
}
