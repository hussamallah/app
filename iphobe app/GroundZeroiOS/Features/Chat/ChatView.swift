import SwiftUI

struct ChatView: View {
    @ObservedObject var viewModel: ChatViewModel

    var body: some View {
        NavigationStack {
            VStack {
                HStack {
                    Button("New Session") { viewModel.newSession() }
                    Spacer()
                    Text("\(viewModel.sessions.count) saved")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal)
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 12) {
                        ForEach(viewModel.messages) { message in
                            HStack {
                                if !message.isUser {
                                    Text(message.content)
                                        .padding(10)
                                        .background(.thinMaterial)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    Spacer()
                                } else {
                                    Spacer()
                                    Text(message.content)
                                        .padding(10)
                                        .foregroundStyle(.white)
                                        .background(.blue)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                }
                            }
                        }
                    }
                    .padding()
                }

                HStack {
                    TextField("Ask Ground Zero AI...", text: $viewModel.draft, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                    Button("Send") {
                        viewModel.send()
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
                }
                .padding()

                if let error = viewModel.error {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(.bottom, 8)
                }
            }
            .navigationTitle("AI Chat")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Reset") {
                        viewModel.clear()
                    }
                }
            }
        }
    }
}
