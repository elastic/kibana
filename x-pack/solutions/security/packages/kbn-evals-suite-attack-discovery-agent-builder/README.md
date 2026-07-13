# Attack Discovery Agent Builder Eval Suite

Isolated evaluation suite for the Attack Discovery 2.0 Agent Builder integration.

## Natural routing (default)

Committed evals use the **default Agent Builder router** — no `configuration_overrides`.
Dataset `expectedSkills` feeds only the **Skill Invoked** evaluator: it scores whether
the router picked the right skill, matching real user behavior.

Low Skill Invoked scores are **routing/skill-description work** (fix the skill or router),
not harness tweaks.

Trajectory precision excludes `load_skill` calls — natural routing always pays that
framework cost; the evaluator measures waste after the skill is loaded.

## Scenario registry (Kibana-native, clean profile)

The portable AD2 seeder (`ad-2.0-portable-seeder.py`) is **not** invoked by this suite.
Its clean-profile attack chains are reimplemented in TypeScript under `src/scenario_registry/`:

| Scenario key | Host | Stages |
| --- | --- | --- |
| `encoded-powershell` | `wks-alice-01` | Office → encoded PowerShell → C2 → Run key → SMB |
| `bits-mshta` | `wks-jordan-04` | Adobe → BITS → mshta → schtasks → LSASS dump |
| `linux-curl` | `web-prod-07` | nginx exploit → curl pipe bash → cron → SUID bash |
| `wmi-lateral` | `wks-karen-06` | rundll32 → certutil → WMI subscription → remote schtasks |

- **Seed label:** `ad-portable-seeder-2026-07` (parity with the portable seeder for cleanup)
- **Legacy golden-path fixtures** (`src/fixtures.ts`, marker `ad2-agent-builder-eval-20260712`) remain unchanged for routing/workflow evals.
- **New eval cases** should import from `src/scenario_registry` and call `seedAd2ScenarioProfile()` / `cleanupAd2ScenarioProfile()`.
- **Clean-profile eval coverage** (`evals/clean_profile_provided_alerts.spec.ts`) mirrors portable seeder `seed --profile clean`: all four scenario keys above, seeded together in `beforeAll`, one provided-alerts eval per chain.

```typescript
import { buildAd2SeedPlan, seedAd2ScenarioProfile } from '../src/scenario_registry';

// Dry-run document plan (no ES writes)
const plan = buildAd2SeedPlan({ profile: 'clean', scenarioKey: 'encoded-powershell' });

// Seed one chain or the full clean profile in Playwright beforeAll
await seedAd2ScenarioProfile(esClient, fetch, { profile: 'clean' });
```

`full` profile (cloud scenarios + background noise) is not implemented yet — add scenarios to the registry before expanding eval coverage.
