# @kbn/security-mitre-attack-server

Server-only package holding the bundled MITRE ATT&CK data artifact and the
build script that generates it from upstream MITRE STIX bundles.

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

## Where this is going

This package is the first step of the managed MITRE ATT&CK data source work
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
