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

When endpoint metadata includes `capabilities.templates.policy: required`, Kibana
sends `{ template: { id, version, variables } }` and omits `messages`. If that
block is absent, the connector keeps the messages path. Endpoints with
`templates.policy: required` stay out of the EIS catalog, the global default, and
every Model Settings row except AlertZero's Cyber domain models row. That row
also lists ordinary models. Attack Discovery, alert triage, and the FP/TP judge
use a model saved there. Until one is saved, Attack Discovery and the judge stay
on Frontier models and alert triage stays on Efficient models.
