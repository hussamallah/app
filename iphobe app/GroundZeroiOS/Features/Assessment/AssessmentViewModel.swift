import Foundation

@MainActor
final class AssessmentViewModel: ObservableObject {
    @Published var bank: AssessmentBank?
    @Published var currentIndex = 0
    @Published var pendingBinary: String?
    @Published var errorMessage: String?

    private let runStore: RunStore
    private let repository: ArchetypeRepository
    private let scoringEngine: ScoringEngine

    init(
        runStore: RunStore,
        repository: ArchetypeRepository = ArchetypeRepository(),
        scoringEngine: ScoringEngine = ScoringEngine(),
        profileComposer: ProfileComposer = ProfileComposer()
    ) {
        self.runStore = runStore
        self.repository = repository
        self.scoringEngine = scoringEngine
        _ = profileComposer
        load()
    }

    var currentFacet: FacetItem? {
        guard let bank, bank.facetList.indices.contains(currentIndex) else { return nil }
        return bank.facetList[currentIndex]
    }

    var progressText: String {
        "\(min(currentIndex + 1, bank?.facetList.count ?? 0))/\(bank?.facetList.count ?? 0)"
    }

    func selectBinary(_ value: String) {
        pendingBinary = value
        runStore.draft.pendingBinary = value
        runStore.saveDraft(runStore.draft)
    }

    func submitLikert(_ likert1to5: Int) {
        guard let binary = pendingBinary else { return }
        var draft = runStore.draft
        let code: Int
        switch binary {
        case "Yes": code = FacetOutcomeCode.fromYesLikert(likert1to5)
        case "No": code = FacetOutcomeCode.fromNoLikert(likert1to5)
        default: return
        }
        draft.facetOutcomes.append(code)
        draft.currentFacetIndex = min(draft.currentFacetIndex + 1, (bank?.facetList.count ?? 1))
        draft.pendingBinary = nil
        runStore.saveDraft(draft)
        currentIndex = draft.currentFacetIndex
        pendingBinary = nil

        if currentIndex >= (bank?.facetList.count ?? 0) {
            finalizeRun()
        }
    }

    func submitYup() {
        var draft = runStore.draft
        draft.facetOutcomes.append(FacetOutcomeCode.yup)
        draft.currentFacetIndex = min(draft.currentFacetIndex + 1, (bank?.facetList.count ?? 1))
        draft.pendingBinary = nil
        runStore.saveDraft(draft)
        currentIndex = draft.currentFacetIndex
        pendingBinary = nil
        if currentIndex >= (bank?.facetList.count ?? 0) {
            finalizeRun()
        }
    }

    private func load() {
        do {
            bank = try repository.loadBank()
            currentIndex = runStore.draft.currentFacetIndex
            pendingBinary = runStore.draft.pendingBinary
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func titleCase(_ id: String) -> String {
        id.prefix(1).uppercased() + id.dropFirst()
    }

    private func canonicalArchetypeKey(_ raw: String) -> String {
        raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "-", with: "")
    }

    private func findPsychology(_ archetypeID: String, psychology: PsychologyPayload) -> PsychologyEntry? {
        let key = canonicalArchetypeKey(archetypeID)
        if let direct = psychology[titleCase(archetypeID)] { return direct }
        for (k, v) in psychology where canonicalArchetypeKey(k) == key {
            return v
        }
        return nil
    }

    private func domainMeans(_ scores: [String: [String: Double]]) -> [String: Double] {
        var out: [String: Double] = [:]
        for d in BigFiveConstants.domainOrder {
            let facets = BigFiveConstants.canonicalFacets(d)
            let vals = facets.map { f -> Double in
                let key = BigFiveConstants.toCanonicalFacet(domain: d, facet: f)
                return min(5.0, max(1.0, scores[d]?[key] ?? 3.0))
            }
            out[d] = vals.reduce(0, +) / Double(max(vals.count, 1))
        }
        return out
    }

    private func pct(_ raw: Double) -> Int {
        Int((((min(5.0, max(1.0, raw)) - 1.0) / 4.0) * 100).rounded())
    }

    private func profile(archetypeID: String, scores: [String: [String: Double]]) -> GZProfile {
        var domains: [String: DomainProfile] = [:]
        for d in BigFiveConstants.domainOrder {
            let raw = domainMeans(scores)[d] ?? 3.0
            let p = pct(raw)
            let bucket = p >= 67 ? "High" : (p <= 33 ? "Low" : "Med")
            domains[d] = DomainProfile(raw: raw, pct: p, bucket: bucket)
        }
        var facets: [String: Double] = [:]
        for d in BigFiveConstants.domainOrder {
            for f in BigFiveConstants.canonicalFacets(d) {
                let k = BigFiveConstants.toCanonicalFacet(domain: d, facet: f)
                facets["\(d):\(f)"] = scores[d]?[k] ?? 3.0
            }
        }
        return GZProfile(domains: domains, facets: facets, archetypeId: archetypeID)
    }

    private func finalizeRun() {
        do {
            guard let bank else { return }
            if runStore.draft.facetOutcomes.count != bank.facetList.count {
                errorMessage = "Facet outcomes are incomplete."
                return
            }
            let rules = try repository.loadRules()
            let psychology = try repository.loadPsychology()
            let scores = AnswerCodeCodec.buildScoresFromFacetOutcomes(bank: bank, facetOutcomes: runStore.draft.facetOutcomes)
            let archetype = scoringEngine.selectArchetype(rules: rules.archetypes, domainScores: scores, pickIndex: 0)
            let code = AnswerCodeCodec.encode(bank: bank, archetypes: rules.archetypes, facetOutcomes: runStore.draft.facetOutcomes, archPickLeft0Right1: 0)
            let compat = CompatibilityEngine.computeCompatibility(a: profile(archetypeID: archetype, scores: scores), b: profile(archetypeID: archetype, scores: scores))
            let run = RunResult(
                id: UUID(),
                createdAt: Date(),
                topArchetype: titleCase(archetype),
                scoredDomains: scoringEngine.mapDomainMeansToBucket(scores),
                bankVersion: bank.version,
                scores: scores,
                facetOutcomes: runStore.draft.facetOutcomes,
                archPickLeft0Right1: 0,
                psychology: findPsychology(archetype, psychology: psychology),
                answerCode: code,
                compatibility: compat
            )
            runStore.appendRun(run)
            currentIndex = 0
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
