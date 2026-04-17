# GroundZeroiOS

Native SwiftUI iPhone app scaffold for Ground Zero.

## What is included

- App shell with `Assessment`, `Results`, and `Chat` tabs
- JSON resources mirrored from Android assets
- Android parity artifacts in `Parity/` (contracts + golden vectors)
- Codable model layer and bundle JSON loader
- Scoring engine with unit tests
- Assessment flow and local persistence (`UserDefaults`)
- Results renderer with native share sheet
- Chat abstraction + Gemini-compatible HTTP service
- Config templates for `xcconfig` and `Info.plist`

## Open in Xcode

1. On macOS, create a new Xcode iOS App project named `GroundZeroiOS` inside this folder.
2. Add all existing source folders/files into that project:
   - `App/`
   - `Core/`
   - `Features/`
   - `Resources/`
   - `Config/`
   - `GroundZeroiOSTests/`
3. Add `arch_rules.json`, `archetypes_atlas.json`, `archetype_psychology.json` to target resources.
4. Copy `Config/GroundZero.example.xcconfig` to `Config/GroundZero.xcconfig` and attach it to build configs.
5. Wire `Config/InfoPlist.template` values into your app Info.plist.

## Parity Verification Checklist

- Run identical answer sets on Android and iOS.
- Compare domain bucket outputs (`O`, `C`, `E`, `A`, `N`).
- Compare top archetype selection for each test set.
- Validate profile text content for selected archetype.
- Validate answer-code roundtrip with `GroundZeroiOSTests/ParityGoldenTests.swift`.

## Release Readiness Checklist

- App icon and launch screen assets added.
- Privacy strings reviewed and complete.
- Offline behavior tested for chat.
- Persistence restore tested after app restart.
- TestFlight build archived and uploaded.
