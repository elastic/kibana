# DOC-001 · Fleet Package Authoring Guide (Kibana-only ETL)

Audience: integration authors packaging an ETL lifecycle as a Fleet package, with **zero custom Kibana code**.

## What a package IS

A directory tree under `packages/<name>/<name>-<semver>/`:

```
manifest.yml              # package identity, vars, install UI
kibana/
  workflow/               # ETL workflows (installed disabled unless opt-in)
  agent/                  # Agent Builder agents
  alerting_rule_template/ # alert rules materialized at install
  esql_view/              # saved ES|QL queries
  index_pattern/
elasticsearch/
  index_template/         # mappings + ILM policy refs
  transform/              # continuous transforms
docs/knowledge_base/      # operational docs shipped with the package
```

## Core rules (learned the hard way, all verified live)

1. **Install-time substitution over runtime magic.** Declare `vars` in manifest.yml; reference them in assets as `{{varname}}`. Ship connectors and alerts referencing substituted values — never hardcode IDs.
2. **Alert rule templates**: PUT-allowlist shape only — `name`, `tags`, `schedule`, `params`, `actions`. Echoing GET-response fields (id, rule_type_id, consumer…) causes a 400 cascade.
3. **Slack actions**: `subAction: "sendMessage"` (camelCase), group `query matched`, and a `frequency` block (`notify_when: onActiveAlert`) is **required** on update even if unchanged.
4. **Template context vars**: `{{context.message}}`, `{{context.value}}`, `{{context.date}}` work; `{{context.source}}` renders empty in Slack actions.
5. **Lookup indices are ILM-exempt**: small static join tables (`mode: lookup`) must not be rolled — exclude them from lifecycle policies explicitly.
6. **Workflows install disabled**; enable per-environment after connectors have credentials.

## Verification checklist before shipping

- [ ] Fresh-install simulation: assets materialize, rules enabled, actions wired
- [ ] Mutation-test each alert: force its condition, observe the action fire (Slack message delivered), restore
- [ ] ES|QL in every rule template executed directly against a populated index (schema paths differ per index — e.g. project-items titles live at `payload.content.title`, not `entity.title`)
- [ ] ILM: policy attached as privileged user; lookup indices exempt
- [ ] Backfill: first install must ingest history (cursor-based sync starting at `cursor: ''` — verify doc counts grow monotonically to corpus size)

See also: DOC-002 (ETL cookbook), DOC-003 (substitution spec), DOC-006 (alert enablement).
