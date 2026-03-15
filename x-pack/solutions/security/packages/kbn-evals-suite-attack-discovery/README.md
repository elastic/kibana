## Attack Discovery eval suite (`attack-discovery`)

This package provides a Kibana eval suite for **Attack Discovery** using the `@kbn/evals` framework (Playwright + Scout).

It’s designed to:
- run dataset-driven evals (JSONL)
- exercise multiple input modes
- score outputs with a legacy rubric (LLM-as-judge) plus deterministic sanity checks

### Suite ID

- **`attack-discovery`**

Registered in `x-pack/platform/packages/shared/kbn-evals/evals.suites.json`.

---

## What this suite evaluates

The core task is: **generate Attack Discoveries** from alert context.

Outputs are scored by:
- **`AttackDiscoveryBasic`** (`CODE`): ensures the output is present and shaped correctly
- **`AttackDiscoveryRubric`** (`LLM`): legacy rubric-based correctness judgement (Y/N mapped to score 1/0)

---

## Input modes

The suite supports an input union `AttackDiscoveryTaskInput` (`src/types.ts`):

### 1) `bundledAlerts` (primary / JSONL)

Use this when your dataset already contains anonymized alert context.

- **Dataset (checked in)**: `./data/eval_dataset_attack_discovery_all_scenarios.jsonl`
- **Loader**: `src/dataset/load_attack_discovery_jsonl.ts`

Each JSONL record is mapped to:
- `input.mode = "bundledAlerts"`
- `input.anonymizedAlerts[]` (objects with `pageContent` + `metadata`)
- `output.attackDiscoveries[]` (expected results)

### 2) `searchAlerts` (API-backed)

This mode triggers Attack Discovery via the existing **public API**:
- `POST /api/attack_discovery/_generate`
- polls `GET /api/attack_discovery/generations/{execution_uuid}` until completion

Implementation lives in `src/clients/attack_discovery_client.ts`.

### 3) `graphState` (prompt-input stub)

This mode accepts partial “graph-state-like” inputs and applies helpful defaults.
It’s intended as an extension point for future parity with deeper legacy graph-state evaluation.

---

## How to run locally

### 0) Bootstrap

From repo root:

```bash
nvm use
yarn kbn bootstrap
```

### 1) Start the local eval stack (Scout)

```bash
nvm use && node scripts/evals scout
```

### 2) Run the suite

```bash
nvm use && node scripts/evals run --suite attack-discovery --model sonnet-3-7 --judge sonnet-3-7
```

### 3) Run only the JSONL-backed spec (via `--grep`)

```bash
nvm use && node scripts/evals run --suite attack-discovery \
  --model sonnet-3-7 --judge sonnet-3-7 \
  --grep "bundled alerts \\(jsonl\\)"
```

### 4) Fast smoke: run exactly one JSONL record

For fast local sanity checks:

- `ATTACK_DISCOVERY_DATASET_LIMIT=1`: load only 1 JSONL record
- `ATTACK_DISCOVERY_DATASET_OFFSET=<n>`: skip the first `n` records (0-based)
- `ATTACK_DISCOVERY_EVAL_CONCURRENCY=1`: run the executor with concurrency 1

Example (run a small record quickly):

```bash
nvm use && ATTACK_DISCOVERY_DATASET_LIMIT=1 ATTACK_DISCOVERY_DATASET_OFFSET=4 ATTACK_DISCOVERY_EVAL_CONCURRENCY=1 \
  node scripts/evals run --suite attack-discovery \
  --model sonnet-3-7 --judge sonnet-3-7 \
  --grep "bundled alerts \\(jsonl\\)"
```

---

## Connector notes / troubleshooting

This suite uses `/internal/inference/prompt` for prompt-based generation and the rubric judge.
In some environments, **`.inference` connectors are not supported** by that endpoint. If you see:

- `Connector '...' of type '.inference' not recognized as a supported connector`

Use a connector that works with the inference prompt endpoint (e.g. `sonnet-3-7`).

If using Azure `.gen-ai` connectors and you see provider errors like `DeploymentNotFound`,
the configured deployment may not exist (or may not be reachable from your environment).

---

## Package notes

This suite is **Node-only** (Playwright eval suite). It includes a package-local ESLint override:
- `./.eslintrc.js` disables `import/no-nodejs-modules` inside this package

That allows the suite to read the checked-in JSONL dataset from `./data`.

