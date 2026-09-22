# @kbn/securitysolution-mitre-catalog

Kibana MITRE ATT&CK catalog snapshot, shared across security-domain packages and plugins.

This is the **slim** view of the catalog: `id`, `name`, `reference`, `value`, and (for techniques) `tactics`. No i18n labels, no rendering helpers, no plugin-specific concerns. Consumers that need translated labels for UI rendering should layer them on top in their own package.

## Public API

```ts
import {
  // Types
  type MitreTactic,
  type MitreTechnique,
  type MitreSubTechnique,
  type MitreAttackCatalog,

  // Lookups
  techniqueById,
  subtechniqueById,
  tacticsToIds,
} from '@kbn/securitysolution-mitre-catalog';
```

`tacticsToIds` translates technique `tactics` (camelCase tactic `value`s as used in the catalog) back to canonical `TAxxxx` IDs — useful for detection-rule handoff and ATT&CK heatmap rendering.

## Regenerating

The catalog at `src/data/mitre_attack_catalog.json` is a snapshot of MITRE ATT&CK data. To refresh it on an ATT&CK release bump, run the security_solution extractor and port the updated data into this package's JSON by hand:

```
cd x-pack/solutions/security/plugins/security_solution
yarn extract-mitre-attacks
```

The extractor updates `security_solution/common/detection_engine/mitre/mitre_tactics_techniques.ts`. Use that output as the authoritative source when updating `src/data/mitre_attack_catalog.json`. Bump `MITRE_CONTENT_VERSION` in the extractor (`scripts/extract_tactics_techniques_mitre.js`) when adopting a new ATT&CK release.
