import Foundation

@MainActor
final class ResultsViewModel: ObservableObject {
    @Published var selectedRun: RunResult?
    private let runStore: RunStore

    init(runStore: RunStore) {
        self.runStore = runStore
    }

    var runs: [RunResult] {
        runStore.runs
    }

    func select(_ run: RunResult) {
        selectedRun = run
    }

    func reportText(for run: RunResult) -> String {
        var lines: [String] = []
        lines.append("Ground Zero Profile")
        lines.append("Archetype: \(run.topArchetype)")
        lines.append("Created: \(run.createdAt.formatted())")
        lines.append("")
        lines.append("Domains:")
        for key in run.scoredDomains.keys.sorted() {
            lines.append("- \(key): \(run.scoredDomains[key]?.rawValue ?? "Unknown")")
        }
        if let psych = run.psychology {
            lines.append("")
            lines.append("Psychological Profile")
            lines.append(psych.psychologicalProfile)
            lines.append("")
            lines.append("Origin")
            lines.append(psych.origin)
            lines.append("")
            lines.append("Inner Conflict")
            lines.append(psych.innerConflict)
            lines.append("")
            lines.append("Field Presence")
            lines.append(psych.fieldPresence)
        }
        return lines.joined(separator: "\n")
    }
}
