import SwiftUI

struct AppRootView: View {
    @StateObject private var runStore = RunStore()

    var body: some View {
        TabView {
            AssessmentView(viewModel: AssessmentViewModel(runStore: runStore))
                .tabItem {
                    Label("Assessment", systemImage: "list.bullet.clipboard")
                }

            ResultsView(viewModel: ResultsViewModel(runStore: runStore))
                .tabItem {
                    Label("Results", systemImage: "chart.pie")
                }

            ChatView(viewModel: ChatViewModel())
                .tabItem {
                    Label("Chat", systemImage: "bubble.left.and.bubble.right")
                }
        }
    }
}
