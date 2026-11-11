# @kbn/security-mitre-attack-common

Canonical MITRE ATT&CK domain model shared between server and browser consumers.

## Contents

- TypeScript types for MITRE entities: `MitreEntity` (a discriminated union of
  `MitreTactic`, `MitreTechnique`, and `MitreSubtechnique`), `MitreFramework`,
  and `MitreEntityType`. Every entity carries its own `framework` and
  `framework_version` fields so each entity is fully self-describing.
- Zod schemas (`mitreEntitySchema`, `mitreEntitiesSchema`) for validating data
  against the domain model. `mitreEntitiesSchema` validates the artifact file
  content, which is a flat array of entities.

Entity fields use snake_case names (e.g. `framework_version`, `tactic_ids`) to
match the Elasticsearch field naming convention, since entities are stored and
queried with these field names.
