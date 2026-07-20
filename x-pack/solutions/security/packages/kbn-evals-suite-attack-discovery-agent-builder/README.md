# Attack Discovery Agent Builder Eval Suite

Isolated evaluation suite for the Attack Discovery 2.0 Agent Builder integration.

## Eval profiles and CI cadence

This package ships **two eval cohorts** plus a documented third profile that is not automated here yet.

| Profile | Spec | Seed data | CI cadence | Primary question |
| --- | --- | --- | --- | --- |
| **Golden-path** | `evals/attack_discovery_agent_builder.spec.ts` | `src/fixtures.ts` — 2 marker alerts | **Weekly** (`llm_evals.yml` sets `EVAL_GREP`) | Does the default agent **route**, **call AD tools**, and **complete the workflow**? |
| **Clean profile** | `evals/clean_profile_provided_alerts.spec.ts` | `src/scenario_registry/` — 4 chains, 16 alerts + raw events | **On-demand** (full suite or `--grep "clean profile"`) | On realistic multi-stage chains, does AD produce **quality discoveries** with context gathering? |
| **Full profile** | — (not in this package) | External noise generator (~150+ distractor alerts) | Manual / future follow-up | With ~150+ distractor alerts, does AD find real chains **without noise false positives**? |

### Golden-path (`fixtures.ts`)

Marker: `ad2-agent-builder-eval-20260712`. Minimal, fast, deterministic.

Cases in `src/dataset.ts`:

- **provided-alerts** (golden) — alerts attached in converse
- **live-retrieval** (golden) — agent retrieves marker alerts via ES|QL/search tooling
- **multiple-alert-sets** — provided alerts, alternate prompt shape
- **missing-alert retrieval** — retrieval returns zero alerts
- **status-only** — execution status lookup without running discovery

Weekly CI runs only these cases (see `EVAL_GREP` in `llm_evals.yml`).

### Clean profile (`scenario_registry/`)

Kibana-native scenario definitions for multi-stage attack chains. All seeding is in-process via `esClient.index()` — no external dependencies.

| Scenario key | Host | Stages |
| --- | --- | --- |
| `encoded-powershell` | `wks-alice-01` | Office → encoded PowerShell → C2 → Run key → SMB |
| `bits-mshta` | `wks-jordan-04` | Adobe → BITS → mshta → schtasks → LSASS dump |
| `linux-curl` | `web-prod-07` | nginx exploit → curl pipe bash → cron → SUID bash |
| `wmi-lateral` | `wks-karen-06` | rundll32 → certutil → WMI subscription → remote schtasks |

- **Seed label:** `ad-scenario-registry-2026-07`
- One provided-alerts eval per chain; rubric/criteria are chain-specific.

### Full profile (out of scope for this package)

Includes clean profile plus cloud scenarios (AWS, Azure, macOS) and background noise (~110 unrelated alerts + a 40-alert noisy rule cluster). Not automated until discrimination/FPR evaluators exist.

## Natural routing (default)

Committed evals use the **default Agent Builder router** — no `configuration_overrides`.
Dataset `expectedSkills` feeds only the **Skill Invoked** evaluator: it scores whether
the router picked the right skill, matching real user behavior.

Low Skill Invoked scores are **routing/skill-description work** (fix the skill or router),
not harness tweaks.

Trajectory precision excludes `load_skill` calls — natural routing always pays that
framework cost; the evaluator measures waste after the skill is loaded.

## How to run

Weekly gate (golden-path only):

```bash
node scripts/evals run --suite attack-discovery-agent-builder \
  --grep "golden |non-golden"
```

Clean profile (on-demand):

```bash
node scripts/evals run --suite attack-discovery-agent-builder \
  --grep "clean profile"
```

Full package (golden-path + clean profile):

```bash
node scripts/evals run --suite attack-discovery-agent-builder
```
