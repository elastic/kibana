# @kbn/security-mitre-attack-common

Shared MITRE ATT&CK reference data for the Security Solution.

This package owns:

- The `MitreEntity` discriminated-union type (tactic / technique / subtechnique) and its Zod schema.
- The `mitreAttackFieldMap` consumed by `@kbn/index-adapter` to build the managed `.kibana-mitre-attack` index.
- A bundled JSON artifact (`data/mitre_artifact.json`) generated at build time from the upstream STIX bundle, plus a small version stamp file (`data/artifact_version.json`) used by the server to detect when re-hydration is needed.
- A build script (`scripts/build_mitre_artifact.js`) that fetches the STIX 2.1 bundle from MITRE, normalizes it into the entity schema, validates the result, and writes the artifact files in place.

The artifact is a forward-compatible normalization: each entity has a `framework` discriminator (`enterprise` / `mobile` / `ics` / `atlas`) and a `versions` array. The POC artifact contains only ATT&CK Enterprise at a single version; ATLAS/Mobile/ICS plug in by appending another source URL to the build script.

## Regenerating the artifact

```bash
node x-pack/solutions/security/packages/security-mitre-attack-common/scripts/build_mitre_artifact.js
```

The script writes `data/mitre_artifact.json` and `data/artifact_version.json`. Commit both files.

The version pin is constant `MITRE_CONTENT_VERSION` at the top of the script. Bump it when the prebuilt-rules package upgrades, the same cadence as the previous `extract_tactics_techniques_mitre.js` flow.
