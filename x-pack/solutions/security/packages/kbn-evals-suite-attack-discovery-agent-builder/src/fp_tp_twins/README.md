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

## Load

```ts
import { buildEncodedPowershellTwin } from './fp_tp_twins';

const fp = buildEncodedPowershellTwin('fp');
// fp.alerts, fp.events, fp.entities, fp.attack, fp.gold
```
