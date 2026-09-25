# Exploratory Tester Bridge (Phase 4)

Integrates with [`exploratory-tester`](../../exploratory-tester/SKILL.md) ([elastic/kibana#270279](https://github.com/elastic/kibana/pull/270279) — on `main`). **Preferred** Phase 4 live engine when `SKILL.md` exists. **Do not copy** exploratory scripts into this skill.

---

## Capability detect

```bash
ET_SKILL=x-pack/solutions/security/plugins/security_solution/.agents/skills/exploratory-tester/SKILL.md
test -f "$ET_SKILL" && echo available || echo unavailable
```

Record in `plan-#N.json` → `live_engine`: `exploratory-tester` | `bug-reproduce` | `ingest-only`.

When unavailable, Phase 4 uses [`live-validation.md`](live-validation.md) Path B — no error.

---

## AC → flows mapping

For each AC with `validation_tag` including `live_required`:

| Flow field | Source |
|------------|--------|
| `name` | `AC-<id>: <first 8 words>` |
| `entry` | Playbook `live.entry` or AC navigation hint |
| `expected` | Full AC text |
| `timeout` | Playbook default (4 min) or AC complexity |
| `source` | `specified` |
| `ac_id` | `AC-1`, … — store in plan-#N.json for import |
| `target_id` | `ech` or `serverless` — from `live_targets[]` being validated |

---

## Scope file template

Write `.agents/tmp/qa-validation-#<issue>-exploratory-scope.md`:

```markdown
## Exploratory testing scope

### Area
<from playbook — e.g. Entity Analytics, Cloud Security Posture>

### Flows
- AC-1: <short name>
  entry: <path>
  expected: <AC text>
  timeout: 4
  target: ech

### Setup
- role: <from playbook — t2_analyst, platform_engineer>

### Environment
- targets: ech, serverless
- ech:
    type: cloud | local
    url: <from live_targets>
- serverless:
    type: cloud | local
    domain: security_complete
    url: <from live_targets>

### Specs
.agents/tmp/qa-validation-#<issue>-ac-specs.md
```

When only one target is `ready`, list that target only. See [`live-environment.md`](live-environment.md).

---

## Delegation instruction

Tell the agent (or user) to run exploratory-tester with:

```
Read and follow exploratory-tester/SKILL.md
Area: <area>
Flows: (from scope file)
Setup: role: <resolved_role>
Specs: .agents/tmp/qa-validation-#<issue>-ac-specs.md
Environment: (from scope file Environment block)
```

**Scope:** Validate AC — do not add more than 2 agent-generated flows. Focus on specified AC flows only.

For **dual targets**, run separate exploratory sessions per target when URLs or deployment types differ.

---

## Import report into validation

After exploratory session, read `.exploratory-session/report.md` (repo root).

| Exploratory signal | QA `live.by_target[<id>].status` for mapped AC |
|--------------------|------------------------------------------------|
| Flow completed, expected met, no Level 1 finding | `PASS` |
| Level 1 finding contradicting `expected` | `FAIL` |
| Level 2 finding on AC path | `FAIL` or `BLOCKED` (`needs_human`) |
| Flow `blocked`, `cap reached`, sub-agent failure | `BLOCKED` |
| Level 3 only | Does not fail AC unless AC covers that observation |

Copy relevant finding excerpts into `acs[].live.by_target[<id>].evidence`. Link screenshot paths under `.exploratory-session/screenshots/`.

Recompute aggregate `acs[].live.status` per [`live-validation.md`](live-validation.md).

**Overall qa-ticket-validator verdict remains authoritative** — exploratory report is evidence input only.

---

## Ingest existing report (cross-repo / manual)

When user ran exploratory-tester in another clone (e.g. `~/csp-dev/gloria`):

1. User provides absolute path to `report.md`
2. Read report; map `### Flow` / finding sections to AC ids by name prefix `AC-N`
3. Apply import table above; set `target_id` from report or ask user
4. Set `live_engine: ingest-only` in plan-#N.json

If report missing or unparseable → `BLOCKED` for affected ACs.

---

## Verdict mapping examples

**PASS:** Entity analytics management AC — flow "AC-2: Engine Status tab" completed on **ech** target, report shows 0 Level 1, expected tab visible.

**FAIL:** Level 1 finding contradicts AC expecting tab visible for that role.

**BLOCKED:** Report lists flow status `blocked` — prerequisite (entity store not installed).

---

## Post-merge coordination

When both skills exist in repo:

- Browser quirks → update `exploratory-tester/knowledge/<area>.md`
- AC→playbook mappings → update `qa-ticket-validator/references/playbooks/cloud_security.md` only

Do not duplicate knowledge files.
