import Foundation

@MainActor
final class AssessmentViewModel: ObservableObject {
    @Published var questions: [AssessmentQuestion] = []
    @Published var selectedOptionID: UUID?
    @Published var currentIndex = 0
    @Published var errorMessage: String?

    private let runStore: RunStore
    private let repository: ArchetypeRepository
    private let scoringEngine: ScoringEngine
    private let profileComposer: ProfileComposer

    init(
        runStore: RunStore,
        repository: ArchetypeRepository = ArchetypeRepository(),
        scoringEngine: ScoringEngine = ScoringEngine(),
        profileComposer: ProfileComposer = ProfileComposer()
    ) {
        self.runStore = runStore
        self.repository = repository
        self.scoringEngine = scoringEngine
        self.profileComposer = profileComposer
        self.questions = Self.defaultQuestions()
    }

    var currentQuestion: AssessmentQuestion? {
        guard questions.indices.contains(currentIndex) else { return nil }
        return questions[currentIndex]
    }

    var progressText: String {
        "\(min(currentIndex + 1, questions.count))/\(questions.count)"
    }

    func selectOption(_ id: UUID) {
        selectedOptionID = id
    }

    func goNext() {
        guard let question = currentQuestion, let optionID = selectedOptionID else { return }
        guard let option = question.options.first(where: { $0.id == optionID }) else { return }

        var draft = runStore.draft
        draft.answers.append(AssessmentAnswer(questionID: question.id, optionID: option.id))
        for (domain, delta) in option.delta {
            draft.domainScores[domain, default: 50] += delta
            draft.domainScores[domain] = min(100, max(0, draft.domainScores[domain] ?? 50))
        }
        runStore.saveDraft(draft)

        selectedOptionID = nil
        if currentIndex < questions.count - 1 {
            currentIndex += 1
        } else {
            finalizeRun()
        }
    }

    private func finalizeRun() {
        do {
            let rules = try repository.loadRules().archetypes
            let psychology = try repository.loadPsychology()
            let buckets = scoringEngine.mapScoresToBuckets(runStore.draft.domainScores)
            let archetype = scoringEngine.selectArchetype(rules: rules, buckets: buckets)
            let profile = profileComposer.compose(archetype: archetype, psychology: psychology)
            let run = RunResult(
                id: UUID(),
                createdAt: Date(),
                topArchetype: archetype,
                scoredDomains: buckets,
                psychology: profile
            )
            runStore.appendRun(run)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private static func defaultQuestions() -> [AssessmentQuestion] {
        [
            AssessmentQuestion(
                prompt: "I prefer clear plans over improvising.",
                options: [
                    AssessmentOption(label: "Strongly disagree", delta: ["C": -20]),
                    AssessmentOption(label: "Neutral", delta: ["C": 0]),
                    AssessmentOption(label: "Strongly agree", delta: ["C": 20])
                ]
            ),
            AssessmentQuestion(
                prompt: "I seek novelty and fresh ideas often.",
                options: [
                    AssessmentOption(label: "Strongly disagree", delta: ["O": -20]),
                    AssessmentOption(label: "Neutral", delta: ["O": 0]),
                    AssessmentOption(label: "Strongly agree", delta: ["O": 20])
                ]
            ),
            AssessmentQuestion(
                prompt: "I am energized by social interaction.",
                options: [
                    AssessmentOption(label: "Strongly disagree", delta: ["E": -20]),
                    AssessmentOption(label: "Neutral", delta: ["E": 0]),
                    AssessmentOption(label: "Strongly agree", delta: ["E": 20])
                ]
            )
        ]
    }
}
