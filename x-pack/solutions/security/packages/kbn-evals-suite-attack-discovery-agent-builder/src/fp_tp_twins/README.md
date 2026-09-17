# Attack Discovery FP/TP twin pair

A single eval world for a future Attack Discovery FP/TP analyzer. It is not an Attack Discovery *generation* eval.

There is one authored discovery and one alert set. Two worlds sit around them:

| Twin | World | Gold |
| --- | --- | --- |
| `encoded-powershell.tp` | Employee laptop, Word spawned PowerShell, C2 to `malicious-c2.example.com` | `true_positive` |
| `encoded-powershell.fp` | Same alerts and discovery. Host is an Intune/SCCM box; parent is `ccmexec.exe`; destination is `manage.microsoft.com` | `false_positive` |

If an analyst (or a future workflow) sees only the alerts plus the discovery, both twins look like a real attack. The withheld entity store and raw events are what flip the FP twin.

## Layout

```
encoded-powershell.tp/   encoded-powershell.fp/
  attack.json              attack.json     ← identical
  entity.json              entity.json     ← differs
  gold.yaml                gold.yaml       ← differs
```

Full detection-alert and raw-event documents are produced by `buildEncodedPowershellTwin('tp' | 'fp')` from the existing `encoded-powershell` scenario registry, then overlaid. They are not checked in as JSON so they cannot drift from that seeder.

## How to score later

1. Classification matches `gold.yaml`.
2. The result cites at least one `evidence_ids` entry (entity or event), not only the discovery markdown.

Do not generate `attack.json` with Attack Discovery. It is authored on purpose.

## Load in process

```ts
import { buildEncodedPowershellTwin } from './fp_tp_twins';

const fp = buildEncodedPowershellTwin('fp');
// fp.alerts, fp.events, fp.entities, fp.attack, fp.gold
```

## Seed a local stack

Load **one** twin at a time (they share alert and attack ids).

### Prerequisites

1. Elasticsearch and Kibana running. Work in the `default` space.
2. **Entity Store v2** (on by default). If entity CRUD fails, add to `config/kibana.dev.yml` and restart:

   ```yaml
   uiSettings.overrides:
     securitySolution:entityStoreEnableV2: true
   xpack.securitySolution.enableExperimental:
     - entityAnalyticsEntityStoreV2
   ```

   The seeder calls Entity Store install. You can also open **Entity Analytics → Entity Store** once.
3. Open **Attack Discovery** once so `.adhoc.alerts-security.attack.discovery.alerts-default` exists.
4. If Kibana uses `server.basePath` (for example `/sbb`), pass `--kibanaUrl http://127.0.0.1:5601/sbb`.
5. The sample workflow uses `alertzero-thin-agent`. Change `agent-id` if that agent is not installed.

### Seed

```bash
# False-positive world
node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-agent-builder/scripts/load_fp_tp_twin.js --variant fp --kibanaUrl http://127.0.0.1:5601

# True-positive world (replaces the FP world)
node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery-agent-builder/scripts/load_fp_tp_twin.js --variant tp --kibanaUrl http://127.0.0.1:5601
```

Attack document id: `ad-fp-tp-encoded-powershell-attack`.

### Verify the attack in Dev Tools

**Stack Management → Dev Tools → Console:**

```
GET .adhoc.alerts-security.attack.discovery.alerts-default/_search
{
  "query": {
    "ids": { "values": ["ad-fp-tp-encoded-powershell-attack"] }
  }
}
```

Expect `hits.total.value: 1`. Optional checks:

```
GET .alerts-security.alerts-default/_search
{
  "query": { "term": { "labels.ad_portable_seed": "ad-fp-tp-twins-2026-09" } }
}

GET entities-latest-default/_search
{
  "query": { "term": { "entity.id": "host:ad-scenario-host-wks-alice-01" } }
}
```

On the FP world, `entity.sub_type` is `mdm_management`. On the TP world it is `employee_workstation`.

## Run from the Workflows UI

1. Create a user workflow and paste `fp_tp_analysis_user_workflow.yaml`.
2. **Run** with `attack_discovery_id` omitted or set to `ad-fp-tp-encoded-powershell-attack`.
3. Compare `classification` plus cited entity/event ids to `encoded-powershell.{fp,tp}/gold.yaml`.

| Seeded variant | Expected `classification` | Why |
| --- | --- | --- |
| `fp` | `false_positive` | Host is Intune/SCCM (`mdm_management`); parent is `ccmexec.exe`; destination is `manage.microsoft.com` |
| `tp` | `true_positive` | Host is an employee workstation; WINWORD → encoded PowerShell; C2 to `malicious-c2.example.com` |

The workflow is not a managed AlertZero workflow.
