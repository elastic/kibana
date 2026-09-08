# @kbn/evals-suite-endpoint

End-to-end evaluation suite for the **Elastic Defend automatic troubleshooting**
Agent Builder skill. Given a natural-language question about an unhealthy
endpoint host, the agent must read the troubleshooting skill file, call the
`automatic_troubleshooting.check_endpoint_package_freshness` and
`generate_insight` tools, and produce a correct root-cause diagnosis against a
small, deterministic seeded dataset.

This is the reference suite the other Security eval suites are modeled on (e.g.
`@kbn/evals-suite-pci-compliance`): the `src/evaluate.ts` + `src/evaluate_dataset.ts`
+ `src/chat_client.ts` shape, traces, spans, and evaluator fields are kept
comparable across suites.

## Prerequisites

- The suite runs through the `evals_endpoint` Scout `serverConfigSet`
  (`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_endpoint`),
  which extends `evals_tracing` and additionally:
  - enables the `automaticTroubleshootingSkill` experimental feature,
  - turns on Agent Builder experimental features,
  - installs the `endpoint` Fleet package.
- An AI connector available (see `@kbn/evals` docs for standard connector setup).
  The chat client talks to `/api/agent_builder/converse`; override the agent with
  `AGENT_BUILDER_AGENT_ID`.

## Running

From the Kibana repo root:

```sh
# Start Kibana + ES test server with the endpoint config set
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_endpoint

# In another terminal, run the suite
node scripts/evals run --suite endpoint
```

`node scripts/evals start --suite endpoint` manages the Scout server for you and
restarts it when the config set changes. Filter to one scenario with `--grep`,
e.g. `--grep "linux_high_cpu"`.

All evaluation specs live under
[`evals/automatic_troubleshooting`](./evals/automatic_troubleshooting).

## Scenarios

15 scenarios, one example each, defined inline in the spec. Seed data for every
scenario lives in [`src/data_generators/endpoint_data.ts`](./src/data_generators/endpoint_data.ts)
(`SCENARIOS`) and is provisioned into the endpoint metadata, Fleet, policy,
events, and alerts indices in `beforeAll`. Representative cases:

| Scenario | Root cause asserted |
| --- | --- |
| `incompatible antivirus detection` | Conflicting third-party AV processes |
| `policy response failure` | Kernel extension load failure |
| `endpoint alerts missing — shipping failure` | Logstash SSL handshake failure; alerts never reach ES |
| `endpoint exception field mismatch` | Exception on `file.path` while the alert field is `process.executable` |
| `linux high CPU — monitoring scripts` | Monitoring-script process churn |
| `windows high CPU — auth events` | lsass auth events (4624/4634) dominating CPU |
| `linux missed check-ins — SELinux` | SELinux `unlabeled_t` denies `elastic-endpoint` exec (status 203/EXEC) |
| `windows missed check-ins — crash dump` | Repeated `elastic-endpoint.exe` crashes |
| `kafka message size rejection` | Non-retriable "Message size too large" output rejection |
| `windows BSOD — driver regression` | `elastic_endpoint_driver.sys` kernel heap corruption |
| `AWS VPC CNI eBPF conflict` | TC eBPF conflict with host-isolation probes |
| `currently healthy endpoint` | Agent must **not** invent a root cause; must ask for a symptom |
| `stopped united transform` | Stopped `endpoint.metadata_united` transform → missing endpoint list |

## Evaluators

A single LLM evaluator, `Criteria`
([`createEndpointCriteriaEvaluator`](./src/evaluate_dataset.ts)), which judges the
agent response against per-example `output.criteria`. A shared `COMMON_CRITERIA`
set, applied to every scenario, asserts the agent:

1. activated the skill by reading its `SKILL.md`,
2. called `check_endpoint_package_freshness` before diagnosing, and
3. called `generate_insight` to persist structured findings.

The `evals_endpoint` config set also enables OTel tracing, so the framework's
trace-based metrics (tool calls, latency, token usage) are available from each
run's trace.
