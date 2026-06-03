# @kbn/evals-suite-security-ai-rules

Evaluation suite for the Security AI detection-rule generation tool (`security.create_detection_rule`).
It drives the Agent Builder `converse` API with natural-language prompts and scores the generated
ES|QL detection rules against reference rules from `elastic/detection-rules`.

Built on [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals). Specs live in `evals/`,
datasets in `datasets/`, and the converse client + evaluators in `src/`.

## Which agent does it call?

The suite calls `POST /api/agent_builder/converse` with the **default Agent Builder agent**
(`agentBuilderDefaultAgentId`, currently `elastic-ai-agent`). The dedicated `security.agent`
("Threat Hunting Agent") that earlier versions targeted was removed in
[#263996](https://github.com/elastic/kibana/pull/263996); security capabilities are now delivered
as skills/tools on the default agent, so no agent registration is required.

To target a custom agent instead, set `AGENT_BUILDER_AGENT_ID=<agent-id>` (see `src/chat_client.ts`).

The `security.create_detection_rule` tool is registered globally by the Security Solution plugin and
is gated by the `aiRuleCreationEnabled` experimental feature, which is **enabled by default** on
current `main` — no manual flag is needed.

## Prerequisites

- A running Elasticsearch + Kibana stack (Scout-managed is recommended; see below).
- AI connectors configured for the agent model and the LLM-as-judge connector.
- Security data indices present so the rule-creation tool can discover a target index
  (see [Seeding data](#seeding-data)).

## How to run

This suite uses the standard [`@kbn/evals`](../../../../platform/packages/shared/kbn-evals) flow —
no suite-specific setup. The suite is registered in
[`.buildkite/pipelines/evals/evals.suites.json`](../../../../../.buildkite/pipelines/evals/evals.suites.json)
under the id `security-ai-rules`. See the
[`@kbn/evals` README](../../../../platform/packages/shared/kbn-evals/README.md) and
[CLI reference](../../../../platform/packages/shared/kbn-evals/CLI.md) for the full command reference.

`start` is the single entry point: on first run it discovers connectors, starts background services
(EDOT collector + Scout), and runs the suite. Subsequent runs reuse the running services.

```sh
node scripts/evals start --suite security-ai-rules --model <agent-model> --judge <judge-connector>
```

Optional, only if you want connector setup as a separate step shared across terminals (otherwise
`start` does it automatically): `node scripts/evals init`. Use `node scripts/evals doctor` to
diagnose prerequisites.

Useful env vars (full list: `node scripts/evals env`):

| Variable | Purpose |
| --- | --- |
| `EVALUATION_CONNECTOR_ID` | Connector used for LLM-as-judge evaluators. |
| `AGENT_BUILDER_AGENT_ID` | Override the agent id used by `converse` (defaults to the Agent Builder default agent). |
| `EVALUATION_REPETITIONS` | Override the configured repetition count. |

## Datasets

- `sample_rules.ts`, `standard_pairs.ts`, `complex_pairs.ts` — positive cases scored for structural
  validity, MITRE accuracy, severity/risk-score match, and ES|QL functional equivalence.
- `hard_cases.ts` — edge cases (the `very-hard` ones are filtered out of CI for cost/time).
- `negative_pairs.ts` — prompts the model should refuse; scored by the `Rejection` evaluator.

## Seeding data

The rule-creation tool discovers a target index from the cluster using `indexExplorer`
(`@kbn/agent-builder-genai-utils`). If no index matches a prompt's data source, generation fails with
`Could not discover a suitable index`, and `evaluate_dataset.ts` marks those examples N/A
(reported as "Skipped (no index)" in the run summary) so they don't penalize model-quality scores.

To get real scores, seed representative security data so the index patterns referenced by the
datasets exist. The patterns used across the datasets include:

- `logs-endpoint.events.*` (the most common)
- `logs-windows.sysmon_operational*`, `logs-windows.powershell_operational*`
- `logs-network_traffic.*`
- `logs-aws.cloudtrail*`, `logs-azure.auditlogs*`, `logs-gcp.audit*`
- `logs-o365.audit*`, `logs-google_workspace.admin*`, `logs-okta.system*`
- `.alerts-security.*` and the broad `logs-*`

Ways to seed (any one is enough to reduce "no index" skips):

- Install Fleet integrations and load their sample data (Elastic Defend / Endpoint, plus the relevant
  cloud integrations) so `logs-*` data streams exist with realistic ECS fields.
- Restore an `es_archiver` archive containing the relevant data streams.
- Use the Security Solution document generator to populate `logs-endpoint.events.*`.

The richer and more field-complete the data, the better the generated ES|QL can reference real fields.

### Example command

Remember to configure `--model` and `--judge` models

```
KBN_EVALS_SKIP_CONNECTOR_SETUP=true \
node scripts/evals start \
  --suite security-ai-rules \
  --skip-server \
  --skip-init \
  --model openai-connector \
  --judge openai-connector
```
