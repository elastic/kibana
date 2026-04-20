# @kbn/evals-suite-pci-compliance

End-to-end evaluation suite for the **PCI DSS v4.0.1 compliance** Agent Builder
skill. It exercises the consolidated `pci_compliance` tool along with
`pci_scope_discovery` and `pci_field_mapper` against a small, deterministic
dataset and asserts on scoring, evidence, scope claims, and the mandatory QSA
disclaimer.

The suite is modeled on `@kbn/evals-suite-endpoint` so traces, spans, and
evaluator fields are directly comparable across security eval suites.

## Prerequisites

- The feature flag `pciComplianceAgentBuilder` must be enabled on the Kibana
  test server. This is handled automatically when the suite runs through the
  `evals_pci_compliance` Scout `serverConfigSet`
  (`src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/evals_pci_compliance`).
- An AI connector must be available (see the `@kbn/evals` docs for the
  standard connector setup).
- The Agent Builder experimental features UI setting is also enabled by that
  config set.

## Running

From the Kibana repo root:

```sh
# Start the Kibana + ES test server with the PCI compliance config set
node scripts/scout start-server \
  --arch stateful \
  --domain classic \
  --serverConfigSet evals_pci_compliance

# In another terminal, run the suite
node scripts/evals start --suite pci-compliance
```

All evaluation specs live under [`evals/pci_compliance`](./evals/pci_compliance).

## Scenarios

| Spec                              | Skill / Tool                          | What it asserts                                                                                                |
| --------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `requirement 8 — brute force`     | `pci_compliance` (`mode: "check"`)    | Detects failed-login evidence and scores Requirement 8 correctly.                                              |
| `requirement 4 — weak TLS`        | `pci_compliance` (`mode: "check"`)    | Flags legacy TLS/SSL and surfaces affected destinations.                                                       |
| `scope discovery`                 | `pci_scope_discovery`                 | Identifies PCI-relevant indices (auth, network, CHD) across seeded data and classifies them.                   |
| `field mapping for custom data`   | `pci_field_mapper`                    | Suggests correct ECS targets for non-ECS custom fields.                                                        |
| `posture report`                  | `pci_compliance` (`mode: "report"`)   | Generates a multi-requirement scorecard with appropriate statuses, counts, and confidence rollups.             |

## Data generators

Deterministic seed data lives in
[`src/data_generators/pci_data.ts`](./src/data_generators/pci_data.ts). It
provisions three index patterns:

- `logs-pci-eval-auth-*` (ECS auth events, successful and failed logins)
- `logs-pci-eval-network-*` (TLS connections with mixed versions)
- `logs-pci-eval-custom-*` (non-ECS legacy field shapes for field-mapping tests)

The generators expose `seedPciEvalData()` and `cleanupPciEvalData()` so each
spec owns its lifecycle without leaking indices between runs.

## Evaluator

The suite uses a PCI-specific criteria evaluator
(`src/evaluate_dataset.ts#createPciCriteriaEvaluator`) that pins a baseline
(`BASELINE_PCI_CRITERIA`) asserting:

- The DSS version (`4.0.1`) is referenced.
- The response declines to act as QSA attestation (non-attestation disclaimer).
- A structured `scopeClaim` payload is emitted alongside any finding.

Scenario-specific criteria layer on top of the baseline.

## Why a dedicated suite

- **Determinism**: PCI findings depend heavily on the data shape. Seeding a
  small known-good dataset is far more reliable than reusing generic logs.
- **Scope-claim parity**: Every PCI tool response ships a scope claim with
  DSS version, indices, time range, evaluated requirements, checked fields,
  and a disclaimer. The suite asserts on this for every scenario.
- **Feature flag isolation**: The `pciComplianceAgentBuilder` flag is
  off-by-default in Kibana; the `evals_pci_compliance` config set isolates
  the suite from the rest of the eval runners.
