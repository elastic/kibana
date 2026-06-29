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

Domains covered across the datasets include:

- **Collection**: File encryption with WinRAR/7z
- **Credential Access**: LSASS access, Mimikatz usage
- **Defense Evasion**: Windows Defender tampering, event log clearing, UAC bypass
- **Command & Control**: Remote file copy, network connections
- **Privilege Escalation**: UAC bypass, IAM role grants
- **Cloud Security**: AWS S3 policy changes, Azure AD, GCP IAM, O365 audit
- **Execution**: Container creation, npm scripts, GitHub Actions runner tampering

### Adding more rules

To expand the dataset, add entries to the appropriate file in `datasets/`:

```typescript
export const sampleRules: ReferenceRule[] = [
  // ... existing rules
  {
    id: 'your-rule-id',
    name: 'Your New Rule',
    prompt: 'Describe the detection...\n\nAvailable data: logs-endpoint.events.*',
    description: 'Detects XYZ behavior',
    query: 'process where ...', // reference query (EQL or ES|QL)
    threat: [{ technique: 'T1234', tactic: 'TA0001' }],
    severity: 'high',
    tags: ['Domain: Endpoint', 'OS: Windows'],
    riskScore: 73,
    from: 'now-9m',
    category: 'execution',
    esqlQuery: 'FROM logs-endpoint.events.* ...', // optional: ES|QL translation for non-ES|QL rules
  },
];
```

## Seeding data

The rule-creation tool discovers a target index from the cluster using `indexExplorer`
(`@kbn/agent-builder-genai-utils`). If no index matches a prompt's data source, the tool returns a
`NO_DATA` rejection, and `evaluate_dataset.ts` marks those examples N/A (reported as
"Skipped — no data/index" in the run summary) so they don't penalize model-quality scores.

To get real scores, seed representative security data so the index patterns referenced by the
datasets exist. The patterns used across the datasets include:

- `logs-endpoint.events.*` (the most common)
- `logs-windows.sysmon_operational*`, `logs-windows.powershell_operational*`
- `logs-network_traffic.*`
- `logs-aws.cloudtrail*`, `logs-azure.auditlogs*`, `logs-gcp.audit*`
- `logs-o365.audit*`, `logs-google_workspace.admin*`, `logs-okta.system*`
- `.alerts-security.*` and the broad `logs-*`

Ways to seed (any one is enough to reduce "no index" skips):

- **[security-documents-generator](https://github.com/elastic/security-documents-generator)
  (recommended — deterministic).** Generate the same data on every machine by passing a fixed
  `--seed`, so metrics are reproducible across runs and contributors (see
  [Deterministic seeding](#deterministic-seeding-recommended) below).
- Install Fleet integrations and load their sample data (Elastic Defend / Endpoint, plus the relevant
  cloud integrations) so `logs-*` data streams exist with realistic ECS fields.
- Restore an `es_archiver` archive containing the relevant data streams.

The richer and more field-complete the data, the better the generated ES|QL can reference real fields.

### Deterministic seeding (recommended)

To keep eval metrics stable across machines, seed with a **fixed seed** using
[`security-documents-generator`](https://github.com/elastic/security-documents-generator). The same
seed produces the same documents, so "no data" skips and field-coverage scores are reproducible.

```bash
# 1. Clone + install the generator (sibling to the kibana repo).
git clone https://github.com/elastic/security-documents-generator.git
cd security-documents-generator
nvm install && nvm use   # uses the Node version pinned in the generator's .nvmrc
yarn

# 2. Point it at your local stack with the tool's documented basic-auth config.json.
cat > config.json <<'EOF'
{
  "elastic": { "node": "http://localhost:9200", "username": "elastic", "password": "changeme" },
  "kibana":  { "node": "http://localhost:5601", "username": "elastic", "password": "changeme" },
  "serverless": false,
  "eventIndex": "logs-endpoint.events.process"
}
EOF

# 3. Seed correlated multi-source data deterministically and fully non-interactively.
#    The same --seed produces the same documents on every machine. Every prompt flag is
#    supplied so the command never stops to ask a question.
yarn start org-data \
  --size medium \
  --productivity-suite microsoft \
  --detection-rules \
  --integrations aws,azure,gcp,o365,okta,google_workspace \
  --seed 1217
```

The fixed seed `1217` (the tracking issue number) is the convention for this suite — keep it constant
so re-runs are comparable. Supplying every prompt flag (`--size`, `--productivity-suite`,
`--detection-rules`) keeps the command fully non-interactive, so it can be handed to anyone to run
against their own stack. After seeding, run the suite normally; examples whose data sources are now
present will produce real scores instead of `NO_DATA` skips.

> Optional: to also populate the most common endpoint pattern (`logs-endpoint.events.*`), run
> `yarn start generate-events 5000` (it writes to the `eventIndex` configured above). This command
> is not seed-based, so endpoint volumes are not deterministic.

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

## Evaluation metrics

The suite runs 12 evaluators (10 deterministic CODE evaluators, 1 LLM-as-judge evaluator, and 1
rejection evaluator), all defined in `src/evaluate_dataset.ts`. In the summary table they are grouped
into columns for readability.

### Structural validity (CODE)

Six binary evaluators that check whether the generated rule is well-formed:

- **Query Syntax Validity**: Validates ES|QL syntax using the `@elastic/esql` parser. Also rejects
  bare `FROM *` queries, which are disallowed in alerting rules. Score: 1 (valid) or 0 (invalid).
- **Rule Type & Language**: Checks `type === 'esql'` and `language === 'esql'`. Score: 1 or 0.
- **Severity Validity**: Severity must be one of `low`, `medium`, `high`, `critical`. Score: 1 or 0.
- **Risk Score Validity**: Risk score must be a number in the 0–100 range. Score: 1 or 0.
- **Interval Format**: Schedule interval must be a valid duration string (e.g. `5m`, `30s`, `1h`).
  Score: 1 or 0.
- **Lookback Gap**: The `from` field must be >= the `interval` to avoid lookback gaps. Score: 1 (no
  gap) or 0 (gap present).

### Field coverage (CODE — 0–1 scale)

Measures the fraction of required rule fields present: `name`, `description`, `query`, `severity`,
`tags`, `riskScore`. A score of 0.83 means 5 of 6 fields are present.

### Reference match (CODE)

Three evaluators that compare the generated rule against the expected reference:

- **MITRE Accuracy** (F1 score, 0–1): Compares MITRE ATT&CK technique IDs (including subtechnique
  IDs) between the generated and reference rules using precision, recall, and F1. Metadata includes a
  per-technique breakdown.
- **Severity Match** (binary): 1 if the generated severity exactly matches the reference, else 0.
- **Risk Score Match** (0, 0.5, or 1): Exact match = 1.0, within 10 points = 0.5, else 0.

> Severity and risk score are now **model-inferred** from the rule's intent and threat context
> ([#271787](https://github.com/elastic/kibana/pull/271787)) rather than hardcoded to `low` / `21`.
> The graph maps severity to canonical risk-score buckets (`low=21`, `medium=47`, `high=73`,
> `critical=99`, accepting model values within ±15 of the canonical), so these two reference-match
> evaluators are now meaningful signals of how well the model gauges severity. The Risk Score Match
> ±10 partial-credit band aligns with that bucketing.

### ES|QL functional equivalence (LLM-as-judge — binary: 0 or 1)

Uses the built-in `createEsqlEquivalenceEvaluator` from `@kbn/evals` to assess whether the generated
ES|QL query would produce the same detection results as the reference query, regardless of syntax
differences. For non-ES|QL reference rules that have an `esqlQuery` translation, the evaluator
compares against the translation. Returns N/A when no ES|QL ground truth is available.

### Rejection (CODE — binary: 0 or 1)

Scores whether the model correctly refused to generate a rule for a negative case (a prompt where the
available data source cannot support the requested detection). Returns N/A for positive cases.

The rule-creation graph now surfaces a **structured rejection** instead of throwing or producing a
malformed rule ([#270236](https://github.com/elastic/kibana/pull/270236)). On rejection the
`security.create_detection_rule` tool returns `{ success: false, rejected: true, rejectionCode, message }`
with one of these codes:

| Code | Meaning | Eval treatment |
| --- | --- | --- |
| `NO_DATA` | No relevant index/data source found for the request | N/A (environment constraint — see [Seeding data](#seeding-data)) |
| `INVALID_OUTPUT` | The assembled rule failed terminal schema validation | Scored as a model-quality failure (not skipped) |
| `INCOHERENT` / `NOT_SECURITY_RELEVANT` | Reserved for a future pre-flight classifier (no node emits these yet) | Counted as a deliberate refusal |

The `Rejection` evaluator credits a negative case only when the model emits a **deliberate** rejection
(`NO_DATA`, `INCOHERENT`, or `NOT_SECURITY_RELEVANT`) — not merely the absence of a rule. An
`INVALID_OUTPUT` or an uncoded agent crash is therefore not counted as a correct refusal. Score: 1
(deliberately refused) or 0 (generated a rule, or failed without a deliberate rejection). Each negative
dataset entry declares its `expectedRejectionCode` (currently `NO_DATA`), surfaced in the evaluator
metadata for visibility.

### Rule Name / Rule Description (LLM-as-judge — disabled by default)

These two evaluators use `criteria` to check semantic equivalence for the rule name and description
fields. They are intentionally disabled in the default evaluator list because they add significant
latency per example. Re-enable them in `src/evaluate_dataset.ts` (uncomment
`createRuleNameEvaluator` / `createRuleDescriptionEvaluator`) when running thorough multi-model
comparisons.

### Skip wrappers

Evaluators are composed with wrappers that return N/A instead of penalizing scores in situations
where a comparison is not meaningful:

- `skipNegativeCases` — N/A for negative test examples (applied outermost to everything except
  `Rejection`).
- `skipMissingIndexFailures` — N/A when the rule-creation tool reported a `NO_DATA` rejection (or the
  legacy "could not discover a suitable index" message) because no matching data was found (see
  [Seeding data](#seeding-data)).
- `skipAgentErrors` — N/A only for **uncoded** agent/environment errors. Structured rejections that
  carry a `rejectionCode` are deliberate decisions and are not skipped here (so `INVALID_OUTPUT` is
  scored, and `NO_DATA` is handled by `skipMissingIndexFailures`).
- `skipNonEsqlReferences` — applied to the ES|QL equivalence evaluator to avoid meaningless
  comparisons when no ES|QL ground truth exists.

## Troubleshooting

### "API endpoint not found" / evals plugin errors

Confirm the evals plugin is enabled (`xpack.evals.enabled: true`) and the Agent Builder route
(`/api/agent_builder/converse`) is reachable, then restart Kibana. The Scout-managed server enables
these automatically; a self-managed dev server must set them in `config/kibana.dev.yml`.

### Many examples skipped (`NO_DATA` rejection)

The required index for a prompt's data source does not exist, so the rule-creation tool returns a
`NO_DATA` rejection and those examples return N/A (shown as "Skipped — no data/index" in the run
summary). Seed representative data (see [Seeding data](#seeding-data)) to get real scores.

### Low scores on all evaluators

Likely causes: the connector/model is returning errors, the model is a poor fit for the task, or the
agent never invoked `security.create_detection_rule`. Check the Kibana server logs and the
`chat_client.ts` diagnostics (logged at `warning` level), and try a different connector.

## Development

```bash
# Unit tests
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/src/helpers.test.ts

# Type check
node scripts/type_check --project x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules/tsconfig.json

# Lint
node scripts/eslint x-pack/solutions/security/packages/kbn-evals-suite-security-ai-rules
```

## Contributing

When adding new evaluators or modifying existing ones:

1. Add evaluator factory functions in `src/evaluate_dataset.ts` following the existing
   `createQuerySyntaxValidityEvaluator` pattern.
2. Wrap with `skipNegativeCases` / `skipMissingIndexFailures` as appropriate.
3. Add unit tests for any new helper functions in `src/helpers.test.ts`.
4. Test with multiple connectors.
5. Update this README with new metrics and interpretations.
6. Consider statistical significance (run with `--repetitions 3` or more).

## References

- [Elastic Detection Rules Repository](https://github.com/elastic/detection-rules)
- [@kbn/evals documentation](../../../../platform/packages/shared/kbn-evals/README.md)
- [MITRE ATT&CK Framework](https://attack.mitre.org/)
- [ES|QL Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)
