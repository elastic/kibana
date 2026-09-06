# DOC-003 · Placeholder Substitution Convention Spec

## Grammar

Package assets may reference install-time variables:

| Form | Where resolved | Example |
|---|---|---|
| `{{varname}}` | manifest `vars` (user-filled or defaulted at install) | `{{slack_connector_id}}` |
| `{{ Fleet package var }}` | reserved engine prefix (system-provided ids) | connector ids, space id |

## Rules

1. **Substitution happens at install time only.** Assets in `.kibana` are written with concrete values; later var changes require package upgrade reconciliation (open platform gap — FLEET-004).
2. **Vars must be declared in `manifest.yml`** with `type`, `default` (optional), `required`, and a human `description` — the Fleet install form renders from this.
3. **Never substitute into ES mappings** — only into Kibana-space assets (workflow params, alert actions, agent prompts).
4. **Connector references substitute IDs, not credentials.** Credentials live in the connector, referenced by substituted id. This keeps secrets out of package assets entirely.
5. **Alert action templates** use runtime context vars, a different namespace: `{{context.*}}` (message, value, date). Do not conflate install-time `{{var}}` with runtime `{{context.var}}`.

## Verified example (production)

manifest.yml declares `slack_connector_id`; the alert template action references `"id": "{{slack_connector_id}}"`. Install with the real connector id → rule materializes wired. Change the var → re-install re-wires.

## Gaps owned by platform teams (not package authors)

- No re-substitution on var update without upgrade (FLEET-004)
- No `REPLACE_WITH_FLEET_AGENT_*` system substitution yet (AB-006)
