# @kbn/security-mitre-attack-server

Server-only package holding the bundled MITRE data artifact (MITRE ATT&CK
Enterprise and MITRE ATLAS) and the build script that generates it from the
upstream MITRE STIX bundles.

## Scope and lifespan

This package exists to get MITRE reference data into the stack without
introducing new delivery infrastructure: the artifact ships with Kibana, and
`loadMitreArtifact()` is the seam server code reads it through.

Two consequences worth knowing before working in here:

- **The build script and the committed artifact are a transitional delivery mechanism**:
  They exist so the data can ship in-stack today. Once MITRE entities are delivered
  out of band as Fleet package assets, Fleet installs them directly and both the
  artifact and the build script are removed.
- **`loadMitreArtifact()` is the only part intended to be consumed at runtime**:
  The `mitre_attack` plugin calls it during `start()` to populate the
  `mitre-attack-entity` Saved Objects that the internal API and UI read from.
  Nothing else in the package is a public API; the STIX types, mappers, and
  fetch logic are build-time internals and are not exported.

Because the artifact is a rebuildable projection of a versioned upstream source,
it is safe to regenerate and re-commit at any time. Nothing stored here is user
data.

## Contents

- `artifacts/mitre_artifact.json` is a flat JSON array of MITRE entities
  (tactics, techniques, and subtechniques) projected into the
  `@kbn/security-mitre-attack-common` schema. Every entity is self-describing:
  it carries its own `framework` (`enterprise` or `atlas`) and
  `framework_version` fields, so additional frameworks or versions can be
  appended to the same file without any schema change. This file is generated
  output. Do not edit it by hand, always re-run the build script and commit the
  result.
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

The script fetches one STIX bundle per pinned version of each framework,
projects every bundle into the common schema, validates the combined result, and
overwrites `artifacts/mitre_artifact.json`. It prints entity counts per framework
and version so a bundle that mapped incorrectly is visible rather than hidden in
the total.

### Frameworks

Frameworks are declared in `MITRE_FRAMEWORK_DEFINITIONS` in
`src/build_artifact/build_artifact.ts`. Each definition names the framework, the
STIX `source_name` / `kill_chain_name` that identifies its objects
(`mitre-attack` or `mitre-atlas`), how a release tag maps to a bundle URL and a
`framework_version`, and the list of pinned release tags.

| Framework | Upstream | Pinned tags | `source_name` |
|---|---|---|---|
| `enterprise` | [mitre/cti](https://github.com/mitre/cti) `enterprise-attack.json` | `MITRE_CONTENT_VERSIONS` (e.g. `ATT&CK-v19.2`) | `mitre-attack` |
| `atlas` | [mitre-atlas/atlas-data](https://github.com/mitre-atlas/atlas-data/releases) `stix-atlas.json` | `ATLAS_CONTENT_VERSIONS` (e.g. `v2026.08`) | `mitre-atlas` |

The mappers only look at external references and kill chain phases whose source
name matches the framework being built. This matters for ATLAS: many ATLAS
techniques also carry a secondary `mitre-attack` reference to the ATT&CK
technique they correspond to, and that reference must never be used to resolve
an ATLAS id or URL. Subtechnique parents are taken from the `subtechnique-of`
relationship and cross-checked against the subtechnique id minus its last dot
segment (`T1003.001` -> `T1003`, `AML.T0024.002` -> `AML.T0024`).

### Version pins

To ship an additional version, append its release tag to the framework's
versions array and re-run the script. Every tag in every array is fetched on
each run. Pins must stay aligned with the versions used by the
[elastic/detection-rules](https://github.com/elastic/detection-rules) prebuilt
rules:

- ATT&CK tags come from https://github.com/mitre/cti/tags.
- ATLAS tags come from https://github.com/mitre-atlas/atlas-data/releases and
  must match the ATLAS bundle vendored by detection-rules at
  `detection_rules/etc/atlas-v*.json.gz`.

### ATLAS version normalization

ATLAS release tags such as `v2026.08` are normalized to `2026.8` before being
stored as `framework_version` (`normalizeAtlasVersion` in
`build_artifact.ts`). The `framework_version` saved object field uses the
Elasticsearch `version` mapping type, which only orders values that parse as
semver; `2026.08` does not because semver forbids leading zeros, so Elasticsearch
would fall back to lexical ordering and sort `2026.08` above `2026.10`. That
would make latest-version resolution pick the older release on the first ATLAS
bump. Stripping the leading `v` and any leading zeros from each numeric segment
(`v2026.08` -> `2026.8`, `v2026.10` -> `2026.10`, `v5.1.0` -> `5.1.0`) keeps
every ATLAS version comparable. ATT&CK tags only lose their `ATT&CK-v` prefix
(`ATT&CK-v19.2` -> `19.2`).

## Where this is going

This package is the first step of the managed MITRE data source work
([epic](https://github.com/elastic/security-team/issues/17157)). The steps that
follow it, in order:

1. The `mitre_attack` plugin registers the `mitre-attack-entity` Saved Object
   type and populates it from `loadMitreArtifact()` on `start()`, behind a
   feature flag that is off by default. It also exposes a read-only data client
   for other server-side consumers.
2. Internal API routes serve MITRE entities to the browser.
3. The rule create/edit technique picker and the coverage overview switch from
   the old, hardcoded `mitre_tactics_techniques.ts` blob in `security_solution`
   to those routes. The blob stays in place as the flag-off path until then.
4. The feature flag is turned on by default and the old blob is deleted.

Later milestones add MITRE retrieval tooling for AI workflows, then move
delivery to a Fleet package so MITRE updates ship independently of Kibana
releases. That last step is what removes the artifact and build script from this
package, as described in "Scope and lifespan" above.
