import Foundation

final class RunStore: ObservableObject {
    @Published private(set) var runs: [RunResult] = []
    @Published var draft = RunDraft(currentFacetIndex: 0, pendingBinary: nil, facetOutcomes: [])

    private let runsKey = "gz.saved.runs"
    private let draftKey = "gz.current.draft"

    init() {
        restore()
    }

    func saveDraft(_ value: RunDraft) {
        draft = value
        persist(draft, key: draftKey)
    }

    func appendRun(_ run: RunResult) {
        runs.insert(run, at: 0)
        persist(runs, key: runsKey)
        draft = RunDraft(currentFacetIndex: 0, pendingBinary: nil, facetOutcomes: [])
        persist(draft, key: draftKey)
    }

    private func restore() {
        if let savedRuns: [RunResult] = read([RunResult].self, key: runsKey) {
            runs = savedRuns
        }
        if let savedDraft: RunDraft = read(RunDraft.self, key: draftKey) {
            draft = savedDraft
        }
    }

    private func persist<T: Encodable>(_ value: T, key: String) {
        if let data = try? JSONEncoder().encode(value) {
            UserDefaults.standard.set(data, forKey: key)
        }
    }

    private func read<T: Decodable>(_ type: T.Type, key: String) -> T? {
        guard let data = UserDefaults.standard.data(forKey: key) else {
            return nil
        }
        return try? JSONDecoder().decode(type, from: data)
    }
}
