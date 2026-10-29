# EIS prompt templates

EIS owns these templates. They are compiled into the eis-gateway binary from
`prompt-templates/<name>/<version>.yaml`. Kibana does not load the files. It pins
the id and version and sends `template.variables`.

A template id is `.` plus the directory name. Elasticsearch rejects an id that
does not start with a dot, and it requires `version`.

| Id | Version | Call |
| --- | --- | --- |
| `.attack-discovery` | 1 | Classic Attack Discovery and the AlertZero generation worker. `phase` is `generate`, `continue`, or `refine`. `partial` is an empty string on generate. `field_syntax` is the const string the template schema requires. |
| `.alert-triage` | 1 | Alert analysis, including floor triage. One verdict per alert. |
| `.attack-discovery-fp-tp` | 1 | The FP/TP judge for one persisted discovery. |
| `.hunt-dataset-match` | 1 | Hunt Watch dataset matching. Variables are `vendor`, `product`, `datasets`, `techniques`, `iocs`, and `report_text`. Returns `{ datasets: [{ dataset, confidence }] }` with `confidence` from 0 to 1. |
| `.hunt-behavior-extraction` | 1 | Hunt Watch technique extraction. Variables are `environment_context` (max 120000) and `report_text` (max 200000). Returns `{ candidates: [{ technique_id, evidence_quote, llm_confidence }] }` with `llm_confidence` from 0 to 1. |
| `.hunt-recommendations` | 1 | Hunt Watch next-step lines. Variable is `context` (max 64000). Returns `{ recommendations: [{ text, entities_referenced }] }` with at most 8 lines, each `text` 1..2000 characters. |

When endpoint metadata includes `capabilities.templates.policy: required`, Kibana
sends `{ template: { id, version, variables } }` and omits `messages`. If that
block is absent, the connector keeps the messages path. Endpoints with
`templates.policy: required` stay out of the EIS catalog, the global default, and
every Model Settings row except AlertZero's Cyber domain models row. That row
also lists ordinary models. Attack Discovery, alert triage, the FP/TP judge, and
Hunt Watch use a model saved there. Until one is saved, Attack Discovery and the
judge stay on Frontier models, alert triage stays on Efficient models, and Hunt
Watch keeps its own tier mapping. A gateway rejection of a Hunt template falls
back to that tier model for the call.
