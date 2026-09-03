# @kbn/evals-suite-deep-watch-forensics

Gate-discrimination eval suite for the PND **Deep Watch** forensic reconstruction step.

## What this measures

The Deep Watch runs `reconstruct_attack` behind an `if` gate on
`steps.triage_alerts.output.structured_output.isIncident`. This suite asks one
question: **does that gate fire in the correct direction?**

It is deliberately *not* a skill-quality suite. Forensic answer quality
(patient zero correctness, timeline accuracy, IoC extraction) is covered by
`kbn-evals-suite-endpoint/evals/endpoint_forensic_analysis`.

## Why both directions are mandatory

An all-positive dataset scores 100% against a gate wired permanently open.
The headline metric is therefore `discriminates` — at least one correct
*open* and one correct *close* — and the suite throws when only one
direction was observed, rather than reporting a passing accuracy.

## Dataset

| Golden id | Expect incident | Expect forensics | Why |
| --- | --- | --- | --- |
| `dw-001-ransomware-kill-chain` | yes | yes | Kill chain with corroborating telemetry |
| `dw-002-benign-patch-window` | no | no | Benign narrative, host has no telemetry |
| `dw-003-benign-narrative-hostile-telemetry` | yes | yes | Benign *label*, hostile evidence |

Row `dw-003` exists because a benign narrative aimed at a compromised host is
the case where trusting the label rather than the evidence is most tempting.

## Preconditions

The suite self-provisions its cell: it seeds the kill-chain events for
`WKSTN-RECV01`/`SRV-DC01` and one Attack Discovery document per golden row
(flat dotted keys -- the nested-object shape is silently dropped by
`transformSearchResponseToAlerts`), then tears them down afterwards. The
only external requirement is a running Kibana+ES eval cell with a configured
LLM connector, since `triage_alerts` and `reconstruct_attack` call the model.

## Unit tests

The evaluator logic is unit tested and runs without a live stack:

```
node scripts/jest x-pack/solutions/security/packages/kbn-evals-suite-deep-watch-forensics
```
