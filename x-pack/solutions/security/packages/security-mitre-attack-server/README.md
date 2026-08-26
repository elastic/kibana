# @kbn/security-mitre-attack-server

Server-only package holding the bundled MITRE ATT&CK data artifact and the
build script that generates it from upstream MITRE STIX bundles.

## Contents

- `artifacts/mitre_artifact.json` is a flat JSON array of MITRE entities
  (tactics, techniques, and subtechniques) projected into the
  `@kbn/security-mitre-attack-common` schema. Every entity is self-describing:
  it carries its own `framework` and `framework_version` fields, so additional
  frameworks or versions can be appended to the same file without any schema
  change. This file is generated output. Do not edit it by hand, always re-run
  the build script and commit the result.
- `scripts/build_artifact.js` is the artifact build script.
- `loadMitreArtifact()` reads, validates, and caches the bundled artifact.

## Usage

Load the artifact from server code:

```ts
import { loadMitreArtifact } from '@kbn/security-mitre-attack-server';

const entities = loadMitreArtifact();
const tactics = entities.filter((e) => e.type === 'tactic');
```

The result is a flat `MitreEntity[]`, validated against `mitreEntitiesSchema`
on first load and cached for subsequent calls.

## Regenerating the artifact

From the Kibana repo root:

```sh
node x-pack/solutions/security/packages/security-mitre-attack-server/scripts/build_artifact.js
```

The script fetches the pinned MITRE ATT&CK STIX bundle from
[mitre/cti](https://github.com/mitre/cti), projects it into the common schema,
validates it, and overwrites `artifacts/mitre_artifact.json`.

To ship additional MITRE versions, append the corresponding CTI tag to
`MITRE_CONTENT_VERSIONS` in `src/build_artifact/build_artifact.ts` and re-run the
script. Each version in that array is fetched and projected into the artifact on
every build run. The pinned versions must stay aligned with those used by the
[elastic/detection-rules](https://github.com/elastic/detection-rules) prebuilt
rules.
