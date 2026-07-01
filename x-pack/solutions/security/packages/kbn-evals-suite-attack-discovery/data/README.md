# Attack Discovery Eval Dataset

A small reference dataset (`eval_dataset_attack_discovery_all_scenarios.jsonl`) is
**checked in** to this directory. It covers one primary evaluation scenario and is
used as the default when no golden-cluster credentials are configured, so the eval
suite runs out of the box locally and in CI smoke paths.

The full production dataset lives on the golden cluster (`Attack Discovery All
Scenarios`). CI weekly jobs fetch it via Vault-backed `EVALUATIONS_KBN_URL`.

To use a larger or custom dataset, replace the bundled file or point at any path via
`ATTACK_DISCOVERY_DATASET_JSONL_PATH`.

## JSONL format

Each line is a self-contained JSON object:

```jsonl
{"inputs":{"anonymizedAlerts":[{"pageContent":"...","metadata":{}}]},"outputs":{"attackDiscoveries":[...]},"metadata":{"Title":"..."}}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `inputs.anonymizedAlerts` | `AnonymizedAlert[]` | Alert context passed to the bundledAlerts mode |
| `outputs.attackDiscoveries` | `AttackDiscovery[]` | Reference discoveries for rubric judging |
| `metadata.Title` | `string` | Human-readable label in eval results |

## Golden cluster (full dataset)

```bash
# Authenticate first (sources EVALUATIONS_KBN_URL + EVALUATIONS_KBN_API_KEY):
vault login --method oidc
node scripts/evals start --suite attack-discovery \
  --profile local --datasets-profile dev-vault --export-profile local
```

Or upload a local JSONL:

```bash
source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh
node x-pack/solutions/security/packages/kbn-evals-suite-attack-discovery/scripts/upload_dataset.js
```
