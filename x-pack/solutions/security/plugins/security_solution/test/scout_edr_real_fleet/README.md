# Scout EDR real Fleet

Dedicated Scout root for Elastic Defend tests that enroll a **live Endpoint host**.

The default `test/scout/` config set has no Fleet Server and no VirtualBox/Multipass VM. Putting this suite there would either time out in the mocked-fleet Scout lane or skip the live-agent coverage that caught real Fleet regressions.

## What it runs

- Config set: `src/platform/packages/shared/kbn-scout/src/servers/configs/config_sets/edr_real_fleet/`
- Playwright UI: `ui/playwright.config.ts` (`workers: 1`) — browser assertions
- Playwright API: `api/playwright.config.ts` (`workers: 1`) — HTTP only, still enrolls a live host
- Host: Vagrant + VirtualBox on CI (`CI=true`), Multipass locally
- Fleet Server: Docker via `startFleetServerIfNecessary()` after Kibana is up

Both configs are listed in `.buildkite/scout_ci_config.yml` `excluded_configs` so default Scout discovery never picks them up. CI runs them one after the other, so each boots Elasticsearch, Kibana, and its own Endpoint VM.

## Local

Requires Multipass and Docker.

`run-tests --location local` starts Elasticsearch and Kibana. Do not also leave `start-server` running — the two commands fight for the same ports.

Start servers and run tests in one step:

```bash
node scripts/scout run-tests --location local --arch stateful --domain classic \
  --serverConfigSet edr_real_fleet \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts
```

Local serverless Security (complete) uses the same Playwright config and a different server config:

```bash
node scripts/scout run-tests --location local --arch serverless --domain security_complete \
  --serverConfigSet edr_real_fleet \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/ui/playwright.config.ts
```

The API project uses the same server config set and a different Playwright config:

```bash
node scripts/scout run-tests --location local --arch stateful --domain classic \
  --serverConfigSet edr_real_fleet \
  --config x-pack/solutions/security/plugins/security_solution/test/scout_edr_real_fleet/api/playwright.config.ts
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

Swap that config path for `api/playwright.config.ts` to run the HTTP-only specs against the same stack.

## CI

Not part of default Scout (`excluded_configs`). Agents use nested virtualization (`n2-highmem-4`), same class as Defend Workflows Cypress.

- **Targets:** two parallel jobs. One runs stateful classic (ECH). One runs local serverless `security_complete`. Each job runs the UI config and then the API config. Specs opt in with `@local-stateful-classic` and `@local-serverless-security_complete` (no cloud tag, so Scout does not schedule them against a real project).
- **PRs:** path-filtered (`fleet_packages.json`, Endpoint/EDR, response-actions, this suite, or its CI wiring) or labels `ci:scout-edr-real-fleet` / `ci:all-ui-test-suites`. Fleet plugin-only PRs do not upload this job.
- **Weekdays on `main`:** dedicated Buildkite pipeline `kibana / security solution / scout edr real fleet` (05:00 America/New_York, Mon–Fri). Failures go to `#security-defend-workflows-tests`.
- **Not** on every `kibana-security-solution-on-merge` run.
