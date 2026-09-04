# mitre_attack

Managed MITRE ATT&CK data source for Kibana.

This plugin makes structured MITRE ATT&CK data available to the Security solution without external network calls. It registers a Saved Object type, populates it at startup from an artifact bundled with Kibana, and exposes a read-only client for server-side consumers.

It replaces the hardcoded `mitre_tactics_techniques.ts` blob in `security_solution`, which is a large generated file that has to be lazily loaded in the browser, carries no entity descriptions, and produces a very large pull request on every MITRE version bump.

## What this plugin owns

- The `mitre-attack-entity` Saved Object type. Space agnostic, hidden, stored in the Security Solution Saved Objects index.
- Startup population of that type from the artifact shipped in `@kbn/security-mitre-attack-server`.
- `MitreAttackDataClient`, a read-only client returned from the server `start` contract.

## Configuration

The plugin is disabled by default. Nothing is registered and nothing is populated unless this key is set:

```yaml
xpack.mitreAttack.managedSourceEnabled: true
```

The value is exposed to the browser, so the public `start` contract reports it as `isEnabled` for UI code that needs to choose between this data source and the legacy blob.

## Data service lifecycle

`MitreAttackDataService` owns the data in the index. Because the entities come from an artifact that ships inside Kibana rather than from an installable package, the plugin has to hydrate the index itself and track whether that hydration succeeded.

1. `setup()` registers the Saved Object type.
2. `start()` creates a type-scoped internal repository, passes it to the service, and calls `populate()` without awaiting it, so a slow or failing write never blocks Kibana startup.
3. `populate()` reads the artifact through `loadMitreArtifact()` and bulk-creates every entity using a deterministic Saved Object id of `{framework}:{framework_version}:{id}` with `overwrite: true`. Running it again is therefore harmless, which is what makes re-populating on every startup safe.
4. If a run fails, the error is logged and the service stays uninitialized. Kibana still starts normally.
5. Reads go through `MitreAttackDataClient`, and its factory calls `ensureInitialized()` before each method. A read that arrives after a failed startup population triggers one retry. If that retry also fails, reads return an empty collection or `undefined` instead of throwing, so a consumer never sees a 500 caused by missing reference data.

This readiness handling is specific to how Milestone 1 delivers the data. Clients such as `prebuilt_rule_assets_client` have no equivalent, because Fleet installs their Saved Objects and the client only ever reads what is already there.

[Upcoming MITRE work](https://github.com/elastic/security-team/issues/17558) moves delivery to a Fleet package that installs the entities directly as `mitre-attack-entity` Saved Objects. When that lands, `populate()`, the readiness flags and the `ensureInitialized()` gate can all be deleted from this plugin, and the client becomes a plain reader over the index.

## Consuming the data client

Another server plugin that depends on `mitreAttack` reads the client off the start contract:

```ts
import type { MitreAttackServerStart } from '@kbn/mitre-attack-plugin/server';

public start(core: CoreStart, plugins: { mitreAttack?: MitreAttackServerStart }) {
  const dataClient = plugins.mitreAttack?.getMitreDataClient?.();

  if (dataClient) {
    // All active enterprise tactics and techniques for the latest shipped version.
    const collection = await dataClient.list({ types: ['tactic', 'technique'] });

    // A single entity by its MITRE id.
    const tactic = await dataClient.getById('TA0001');
  }
}
```

## Saved Object mappings

The type uses `dynamic: false` and maps only the fields that are queried, sorted or aggregated on. Unmapped attributes such as `reference` and `superseded_by_id` are still stored in `_source` and returned by reads, they just cannot be used in a query.

Once this type ships, indexing an additional field requires a new model version containing a `mappings_addition` change. Editing the mappings of an existing model version has no effect on an index that already recorded that version, and the migrator will skip it silently.
