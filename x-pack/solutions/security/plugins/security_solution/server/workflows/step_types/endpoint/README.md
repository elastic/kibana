# Elastic Defend workflow steps

Server step definitions for Elastic Defend managed workflows. Every step in this
directory is a `security.*` custom step, shared by every Defend skill and workflow
that needs it.

## Conventions

Every step added under this directory follows these rules.

**Any-flag rule.** A step that more than one feature uses registers when
**any** consumer's feature flag is on. Each step group has one unit test per
consumer flag that asserts registration with only that flag on. There is no
Defend-shared flag: a new consumer ORs its own flag into the group.

**Generic steps.** Data steps take plain ids and options, return Defend
facts, and contain no skill-specific interpretation. A behaviour that only one
feature needs is an input option that is off by default. Interpretation
(health labels, caveats, envelopes, telemetry) lives in a feature-specific step,
never in a shared data step.

**Tech preview and additive change.** Every step declares
`stability: 'tech_preview'` and its description says the contract can change.
Output changes are additive where possible. Before a breaking change, search the
managed workflow definitions for the step type.

**Contracts mirror their source types.** An output field that has a source
type keeps that type's name and path as a subset (`HostInfo`, Fleet `Agent`,
`HostPolicyResponse`, the Fleet package info `item`, the Elasticsearch response).
Step-owned fields exist only where no source type exists (identity keys,
`status`, `truncation`, `unauthorized[]`, `unavailable[]`, counts, derived
flags). "Not reported" means the field is absent; `null` means only that a whole
document does not exist or was not read. Every output and every record is an
object, so fields can be added at any level. Closed vocabularies are documented
as "may grow" and consumers handle unknown values. A later field is one more path
from the same type. An owner signs off each step's id, inputs and outputs before
the step leaves tech preview.

**Read through the step context (existing routes first).** Kibana reads go through
`context.contextManager.callKibanaApi`; the route keeps its own authorization,
space check and cross-project search. Elasticsearch reads with no route go
through `context.contextManager.getScopedEsClient()` as the invoking user. The
one exception is an internal-user ES client captured through a start-services
closure at registration time, passed in by the registering factory, never
imported from another plugin.

**Degrade, do not crash.** A part that cannot be read (unauthorized, not found,
missing index) becomes a caveat or `unauthorized` / `unavailable` entry, and the
remaining parts still return.

## Directory layout

```text
endpoint/
├── artifacts/              # security.findEndpointArtifacts: exception-list reads
│   ├── contracts/          # zod schemas and enums shared with the public registry
│   ├── find/               # security.findEndpointArtifacts handler
│   └── steps/              # find step common definition
├── integration_knowledge/  # security.searchIntegrationKnowledge: .integration_knowledge grounding
└── register_workflow_steps.ts
```

`hosts/` (resolve, diagnostics, inventory counts), `package/` (package status)
and `configuration_troubleshooting/` (finalize) land with the Automatic
Troubleshooting steps. Input/output schemas the handlers implement live in
`common/workflows/step_types/endpoint/`, shared with the public step registry in
`public/workflows/step_types/endpoint/steps.ts`. Shared envelope primitives
(`Truncation`, the budget constants) live in
`common/workflows/step_types/common/`.
