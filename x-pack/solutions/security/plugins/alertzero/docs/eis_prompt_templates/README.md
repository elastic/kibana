# EIS prompt templates (draft)

Proposed prompt templates for OpenAI cyber models on the Elastic Inference Service. EIS owns the files, renders them, and rejects raw `messages` when an endpoint's `capabilities.templates.policy` is `required`. Kibana does not load this directory.

The filename stem is the template id. Kibana pins that id and sends `template.variables`. When the selected connector is not template-only, Kibana keeps sending `messages` as it does today.

These three cover the current messages-only calls:

| File | Call |
| --- | --- |
| `attack-discovery.yaml` | Classic Attack Discovery and the AlertZero generation worker. `phase` is `generate`, `continue`, or `refine`. |
| `alert-triage.yaml` | Alert analysis, including floor triage. One verdict per alert. |
| `attack-discovery-fp-tp.yaml` | The FP/TP judge for one persisted discovery. |

A saved Attack Discovery prompt override is not a variable. The prompt text stays in the template.
