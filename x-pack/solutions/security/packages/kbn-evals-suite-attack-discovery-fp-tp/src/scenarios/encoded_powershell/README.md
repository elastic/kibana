# encoded-powershell scenario

The eval world for the Attack Discovery FP/TP analysis built on the `encoded-powershell` registry scenario. It is not an Attack Discovery *generation* eval.

There is one authored discovery and one alert set. Two worlds sit around them:

| Twin | Situation | World | Gold |
| --- | --- | --- | --- |
| `encoded-powershell.tp` | U6 | Employee laptop, Word spawned PowerShell, C2 to `malicious-c2.example.com` | `true_positive` |
| `encoded-powershell.fp` | U1 | Same alerts and discovery. Host is an Intune/SCCM box; parent is `ccmexec.exe`; destination is `manage.microsoft.com` | `false_positive` |

If an analyst (or the analysis workflow) sees only the alerts plus the discovery, both twins look like a real attack. The entity store and raw events are what flip the FP twin.

`examples.ts` derives the eval's evidence-state examples (missing entities on either twin, missing events, mixed world, and both failure paths) from these two twins.

## Layout

```
ids.ts             Scenario key, attack id, host and user names, digest ids per run marker
attack.ts          Authored Attack Discovery (shared by both twins)
entities.ts        Entity store documents (differ per twin)
overlay_events.ts  Raw-event overlays (differ per twin)
gold.ts            Gold labels (differ per twin)
build_twins.ts     buildEncodedPowershellTwin(variant, runMarker)
examples.ts        The eval examples
index.ts           encodedPowershellScenario

tp/   fp/
  attack.json   attack.json   ← identical
  entity.json   entity.json   ← differs
  gold.yaml     gold.yaml     ← differs
```

The files in `tp/` and `fp/` are reference copies built with the default run marker (`ad-fp-tp-twins-2026-09`). Full detection-alert and raw-event documents are produced by `buildEncodedPowershellTwin('tp' | 'fp', runMarker)` from the `encoded-powershell` scenario registry in `@kbn/evals-suite-attack-discovery-agent-builder`, then overlaid. They are not checked in as JSON so they cannot drift from that seeder.

## Ids

Alert, event, host, and process ids are digests of the run marker (`ad-scenario-<kind>-<16 hex>`), so each marker seeds its own documents. `getEncodedPowershellIds(runMarker)` returns the ones the overlays and gold refer to. The eval gives every run its own marker and then suffixes the scenario's `sharedNames` (attack id, host name, user name) with `uniquify`.

Do not generate `attack.json` with Attack Discovery. It is authored on purpose.

## Load in process

```ts
import { buildEncodedPowershellTwin } from './scenarios/encoded_powershell';

const fp = buildEncodedPowershellTwin('fp');
// fp.alerts, fp.events, fp.entities, fp.attack, fp.gold
```

## Seed a local stack

Load **one** twin at a time (with the default marker they share alert and attack ids).

### Prerequisites

1. Elasticsearch and Kibana running. Work in the `default` space.
2. Entity Store v2 (on by default). The seeder installs the Entity Store if needed, then stops log extraction so the store holds only the seeded entities. Run `PUT /api/security/entity_store/start` to resume it.

### Seed

```bash
# False-positive world
node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-fp-tp/scripts/load_fp_tp_twin.js --scenario encoded-powershell --variant fp --kibanaUrl http://127.0.0.1:5601

# True-positive world (replaces the FP world)
node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-fp-tp/scripts/load_fp_tp_twin.js --scenario encoded-powershell --variant tp --kibanaUrl http://127.0.0.1:5601
```

`--scenario` defaults to `encoded-powershell`.

Attack document id: `ad-fp-tp-encoded-powershell-attack`.

### Verify in Dev Tools

```
GET .adhoc.alerts-security.attack.discovery.alerts-default/_search
{
  "query": { "ids": { "values": ["ad-fp-tp-encoded-powershell-attack"] } }
}

GET .alerts-security.alerts-default/_search
{
  "query": { "term": { "labels.ad_portable_seed": "ad-fp-tp-twins-2026-09" } }
}

GET entities-latest-default/_search
{
  "query": { "term": { "entity.id": "host:ad-scenario-host-56ef10417335cd10" } }
}
```

On the FP world, `entity.sub_type` is `mdm_management`. On the TP world it is `employee_workstation`.

## Run from the Workflows UI

Paste `../../sample_workflow/fp_tp_analysis.yaml` into a new workflow and run it with `attack_discovery_id: ad-fp-tp-encoded-powershell-attack` and the id of any existing Agent Builder conversation as `investigation_id`. The `alertzero_reasoning` inference feature needs AlertZero enabled and a connector assigned.

| Seeded variant | Expected `payload.verdict` | Why |
| --- | --- | --- |
| `fp` | `false_positive` | Host is Intune/SCCM (`mdm_management`); parent is `ccmexec.exe`; destination is `manage.microsoft.com` |
| `tp` | `true_positive` | Host is an employee workstation; WINWORD → encoded PowerShell; C2 to `malicious-c2.example.com` |
