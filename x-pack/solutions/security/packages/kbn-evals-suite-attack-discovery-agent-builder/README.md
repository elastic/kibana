# Attack Discovery Agent Builder Eval Suite

Isolated evaluation suite for the Attack Discovery 2.0 Agent Builder integration.

## Eval profiles and CI cadence

This package ships **three eval cohorts**: golden-path, clean, and dense (weekly/on-demand mix below), plus the on-demand **full profile** discrimination cohort.

| Profile | Spec | Seed data | CI cadence | Primary question |
| --- | --- | --- | --- | --- |
| **Golden-path** | `evals/attack_discovery_agent_builder.spec.ts` | `src/fixtures.ts` — 2 marker alerts | **Weekly** (`llm_evals.yml` sets `EVAL_GREP`) | Does the default agent **route**, **call AD tools**, and **complete the workflow**? |
| **Clean profile** | `evals/clean_profile_provided_alerts.spec.ts` | `src/scenario_registry/` — 4 chains, 16 alerts + raw events | **On-demand** (full suite or `--grep "clean profile"`) | On realistic multi-stage chains, does AD produce **quality discoveries** with context gathering? |
| **Dense profile** | `evals/dense_profile_live_retrieval.spec.ts` | `src/scenario_registry/` — the 4 clean chains + background noise, 95 alerts | **On-demand** (full suite or `--grep "dense profile"`) | At a realistic alert volume, does AD **retrieve and correlate** the real chains out of a crowded index, live, without being handed the alerts? |
| **Full profile** | `evals/full_profile_discrimination.spec.ts` | `scenario_registry/` full seed (7 chains + 150 noise alerts) | **On-demand** — `--grep "full profile"` | With noise present, does AD find real chains **without citing noise alerts**? |

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

Kibana-native scenario definitions for multi-stage attack chains. All seeding is in-process via `esClient.index()` — no external dependencies (a Kibana-native reimplementation of the portable seeder's `--profile clean`; it does not invoke `ad-2.0-portable-seeder.py` at runtime).

| Scenario key | Host | Stages |
| --- | --- | --- |
| `encoded-powershell` | `wks-alice-01` | Office → encoded PowerShell → C2 → Run key → SMB |
| `bits-mshta` | `wks-jordan-04` | Adobe → BITS → mshta → schtasks → LSASS dump |
| `linux-curl` | `web-prod-07` | nginx exploit → curl pipe bash → cron → SUID bash |
| `wmi-lateral` | `wks-karen-06` | rundll32 → certutil → WMI subscription → remote schtasks |

- **Seed label:** `ad-scenario-registry-2026-07` — the prefix of the per-run marker each
  seeding run stamps (`<label>-<suffix>`) on the documents it writes, on its retrieval
  scope and on its cleanup predicate, so two concurrent runs never reach each other's fixture.
- One provided-alerts eval per chain; rubric/criteria are chain-specific.

#### The target/noise invariant

The dense profile measures whether AD **correlates** the real chains out of a crowded
index, so no observable may separate target from noise on its own — otherwise a model
solves the population with one `GROUP BY` and never reads the alerts. Every observable
that the reference chains and the background share has to OVERLAP on both sides:

| Observable | Why it cannot separate the sides |
| --- | --- |
| `_id` | Opaque digests (`ids.ts`); the scenario key is never spelled out |
| `rule.name` | Occurrences suffix their own names, so both sides span 1–4 |
| `process.name` | Same — occurrence 1 keeps the literal, later ones suffix |
| `user.name` | Per-occurrence users; a user maps to exactly one host |
| chain length | Some background chains are 4 steps, matching the reference chains |
| `raw` backing | `bg-endpoint-inventory` is `raw: true`, so source-event existence does not discriminate |
| severity / `risk_score` | `bg-vendor-update` carries high/critical, so severity alone does not discriminate |
| host / agent id | Occurrence-local; a host never appears on both sides |
| host aggregates | `bg-endpoint-inventory`'s per-host min/max/sum of risk score, message length, and command-line length all sit INSIDE the reference band |

`dense_scenarios.test.ts` pins each of these. When adding a background template, check
every field it emits against the reference chains: if the value (or its frequency)
appears on one side only, the profile is solvable without reasoning.

Two rules that are easy to miss, both learned by breaking them:

1. **A conjunction is as good as a field.** `COUNT(*) = 4 AND MIN(risk_score) >= 72`
   recovers the reference hosts exactly even though neither predicate does alone, and
   it took four rounds of single-field fixes to surface. The pinning test therefore
   sweeps every candidate threshold over every host aggregate and asserts that no
   single predicate **and no pair** isolates the reference cohort. Any background
   chain that is the unique holder of a host-level extremum is a key.
2. **A constant background profile is a single point.** Repeating one chain with only
   host/rule/process suffixes gives every host the SAME aggregate value, and any
   threshold that point falls outside of isolates it. Moving the constant does not
   close the hole — it relocates the key (raising the background minimum risk above
   the reference maximum simply inverts it). The values have to sit inside the
   reference band, which means varying them per occurrence.

### Full profile (on-demand)

Includes clean profile plus cloud scenarios (`aws-compromise`, `azure-oauth`, `macos-toolkit`) and noise:

- ~110 unrelated background alerts
- 40-alert Defender signature-update cluster

**CI cadence:** on-demand only (`evals/full_profile_discrimination.spec.ts`). Not wired to weekly `llm_evals.yml`.

**FPR evaluators:** `NoiseFalsePositive`, `DiscoveryCountCap`, `MinValidatedDiscovery` — insights must not cite noise alert IDs, discovery count must stay bounded, and at least one validated discovery is required.

```bash
node scripts/evals run --suite attack-discovery-agent-builder \
  --grep "full profile"
```

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

Dense profile (on-demand):

```bash
node scripts/evals run --suite attack-discovery-agent-builder \
  --grep "dense profile"
```

Full profile (on-demand):

```bash
node scripts/evals run --suite attack-discovery-agent-builder \
  --grep "full profile"
```

Full package (golden-path + clean profile + dense profile + full profile):

```bash
node scripts/evals run --suite attack-discovery-agent-builder
```
