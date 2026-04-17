# Android-to-iOS Parity Contracts

## Assessment Contract
- Input: `bankv1.json` facet sequence (30 facets, domain order `O C E A N`).
- Decision path per facet:
  - `Yes` + Likert `1..5` -> code `5..9`
  - `No` + Likert `1..5` -> code `0..4`
  - `Yup` -> code `10`
- Output:
  - `facetOutcomes[30]`
  - score map keyed by `domain -> canonicalFacet -> raw(1..5)`
  - domain means and bucket mapping

## Archetype Selection Contract
- Build domain states using Android thresholds:
  - facet bucket High if `>=4.0`, Low if `<=2.0`, else Medium
  - domain mean bucket High if `>=3.75`, Low if `<=2.25`, else Medium
- Candidate policy:
  - strict rule match
  - proximity backfill to 2 candidates
  - cap to 2
- Winner selection:
  - if 1 candidate -> winner
  - if 2 candidates -> resolved by pick index (`0`/`1`)

## Answer Code Contract
- Binary format `GZAC` + version `1` + bankVersion + packed 30 codes + arch byte + CRC8.
- URL-safe output prefix `gzac_`.
- Decode rejects mismatched bank version or failed checksum.

## Compatibility Contract
- Domain score: `100 - (abs(aRaw - bRaw)/4)*100`
- Synergy labels: Align/Complement/Tension + Watch special case for N.
- Overall weighted bands:
  - Strong >= 80
  - Moderate >= 60
  - Caution < 60

## Chat Contract
- Gemini request mirrors Android:
  - `contents` array with `role user/model`
  - max history window `24`, first retained turn must be user
- Persist session history with message timestamps and generated session IDs.

