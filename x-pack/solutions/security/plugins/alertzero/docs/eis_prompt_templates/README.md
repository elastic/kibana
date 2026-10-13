# EIS prompt templates (draft)

Proposed prompt templates for OpenAI cyber models on the Elastic Inference Service. EIS owns and renders these files. Kibana pins the filename stem as `template.id` and does not load this directory at runtime.

When the selected connector advertises `capabilities.templates.policy: required`, Kibana sends `{ template: { id, variables } }` and omits `messages`. Any other connector keeps today's messages path, and the template fields are ignored. A template-only connector with no pinned id for that call is not sent messages.

These three cover the current messages-only calls:

| File | Call |
| --- | --- |
| `attack-discovery.yaml` | Classic Attack Discovery and the AlertZero generation worker. `phase` is `generate`, `continue`, or `refine`. |
| `alert-triage.yaml` | Alert analysis, including floor triage. One verdict per alert. |
| `attack-discovery-fp-tp.yaml` | The FP/TP judge for one persisted discovery. |

A saved Attack Discovery prompt override is not a variable. The prompt text stays in the template.
