# Scout EDR real Fleet

Dedicated Scout root for Elastic Defend tests that enroll a **live Endpoint host**.

The default `test/scout/` config set has no Fleet Server and no VirtualBox/Multipass VM. Putting this suite there would either time out in the mocked-fleet Scout lane or skip the live-agent coverage that caught real Fleet regressions.

## What it runs

- Config set: `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/edr_real_fleet/`
- Playwright: `ui/playwright.config.ts` (`workers: 1`)
- Host: Vagrant + VirtualBox on CI (`CI=true`), Multipass locally
- Fleet Server: Docker via `startFleetServerIfNecessary()` after Kibana is up

This config is listed in `.buildkite/scout_ci_config.yml` `excluded_configs` so default Scout discovery never picks it up.

## Local

Requires Multipass and Docker.

`run-tests --location local` starts Elasticsearch and Kibana. Do not also leave `start-server` running — the two commands fight for the same ports.

Start servers and run tests in one step:

```bash
node scripts/scout run-tests --location local --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts
```

To iterate against an already-running stack, start servers once:

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet edr_real_fleet
```

Then run Playwright only:

```bash
node scripts/playwright test \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts \
  --project local
```

## CI

Not part of default Scout (`excluded_configs`). Agents use nested virtualization (`n2-highmem-4`, 130GB), same class as Defend Workflows Cypress.

- **PRs:** path-filtered (`fleet_packages.json`, Endpoint/EDR, response-actions, this suite, or its CI wiring) or labels `ci:scout-edr-real-fleet` / `ci:all-ui-test-suites`. Fleet plugin-only PRs do not upload this job.
- **Weekdays on `main`:** dedicated Buildkite pipeline `kibana / security solution / scout edr real fleet / weekday` (05:00 America/New_York, Mon–Fri). Failures go to `#security-defend-workflows-tests`.
- **Not** on every `kibana-security-solution-on-merge` run.
