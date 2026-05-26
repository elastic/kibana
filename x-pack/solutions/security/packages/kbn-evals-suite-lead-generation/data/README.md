# Lead Generation Eval Dataset

A small reference dataset (`eval_dataset_lead_generation_all_scenarios.jsonl`) is
**checked in** to this directory. It covers the primary evaluation scenarios and is
used as the default when no environment variables are configured, so the eval suite
runs out of the box in CI (via `evals:lead-generation` label) and locally.

To use a larger or custom dataset, place a JSONL file locally at:

```
data/eval_dataset_lead_generation_all_scenarios.jsonl
```

(replacing the bundled file), or point at any file via `LEAD_GENERATION_DATASET_JSONL_PATH`.

## JSONL format

Each line is a self-contained JSON object representing one evaluation example.
The lead generation pipeline always queries the **live entity store**, so the
`input` is minimal (just generation parameters), and the `output` is the
reference expected from a "known good" run on a seeded environment.

```jsonl
{"input":{"maxLeads":10},"output":{"leads":[]},"metadata":{"Title":"Default generation","description":"Basic run with default parameters"}}
{"input":{"maxLeads":5},"output":{"leads":[]},"metadata":{"Title":"Limited generation","description":"Run capped at 5 leads"}}
```

### Fields

| Field | Type | Description |
|---|---|---|
| `input.maxLeads` | `number` (optional) | Max leads to generate (default: no limit) |
| `output.leads` | `Lead[]` | Reference leads (may be empty — quality is judged by the rubric) |
| `metadata.Title` | `string` | Human-readable label shown in eval results |
| `metadata.description` | `string` (optional) | Longer description |

Because lead generation reads live data, the `output.leads` array is used as a
**structural reference** only — the LLM rubric evaluator judges quality
holistically rather than doing exact field comparison.

## Uploading to the golden cluster

Run this once to publish the dataset so CI can fetch it:

```bash
# Authenticate first (sources EVALUATIONS_KBN_URL + EVALUATIONS_KBN_API_KEY):
source x-pack/platform/packages/shared/kbn-evals/scripts/ci/local_ci_env.sh

# Upload (defaults to the JSONL file above):
node x-pack/solutions/security/packages/kbn-evals-suite-lead-generation/scripts/upload_dataset.js

# Or pass a custom path:
node x-pack/solutions/security/packages/kbn-evals-suite-lead-generation/scripts/upload_dataset.js path/to/my.jsonl
```

After uploading, set `LEAD_GENERATION_DATASET_NAME` to the dataset name printed
by the script, then re-run the evals:

```bash
LEAD_GENERATION_DATASET_NAME="Lead Generation All Scenarios" \
  node scripts/evals start --suite lead-generation
```

## Running with a local JSONL (no upload needed)

Set `LEAD_GENERATION_DATASET_JSONL_PATH` to point at your local file instead:

```bash
LEAD_GENERATION_DATASET_JSONL_PATH=data/eval_dataset_lead_generation_all_scenarios.jsonl \
  node scripts/evals start --suite lead-generation
```
