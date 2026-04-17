import Foundation

final class ArchetypeRepository {
    func loadRules() throws -> ArchetypeRulesPayload {
        try BundleJSONLoader.load(ArchetypeRulesPayload.self, resource: "arch_rules.json")
    }

    func loadAtlas() throws -> PsychologyPayload {
        try BundleJSONLoader.load(PsychologyPayload.self, resource: "archetypes_atlas.json")
    }

    func loadPsychology() throws -> PsychologyPayload {
        try BundleJSONLoader.load(PsychologyPayload.self, resource: "archetype_psychology.json")
    }
}
