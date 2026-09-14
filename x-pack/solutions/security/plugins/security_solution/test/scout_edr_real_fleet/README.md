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

```bash
node scripts/scout start-server --arch stateful --domain classic --serverConfigSet edr_real_fleet
node scripts/scout run-tests --location local --arch stateful --domain classic \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts
```

## CI

Path-filtered on PRs (Fleet + EDR + this suite’s dispatch/flyout paths). Always-on in `security_solution_on_merge.yml`. Agents use nested virtualization (`n2-highmem-4`, 130GB), same class as Defend Workflows Cypress.
