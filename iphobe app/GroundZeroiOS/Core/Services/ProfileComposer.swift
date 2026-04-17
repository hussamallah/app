import Foundation

struct ProfileComposer {
    func compose(archetype: String, psychology: PsychologyPayload) -> PsychologyEntry? {
        psychology[archetype]
    }
}
