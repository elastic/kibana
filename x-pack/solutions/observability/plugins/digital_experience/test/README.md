# Digital Experience Scout tests

The plugin is behind the `digitalExperience.enabled` feature flag (default `false`). All specs run on the default Scout server, and switch the flag at runtime with `apiServices.core.settings` (`feature_flags.overrides`):

| Specs | Flag | How | Deployments (`tags.ts`) |
| --- | --- | --- | --- |
| Flag-on (most specs) | on | each `global.setup.ts` turns it on | local stateful and serverless Observability Complete |
| Flag-off (`feature_disabled`, `app_access_disabled`, `navigation_disabled`) | off | the spec turns it off in `beforeAll`, and back to the global setup's value in `afterAll` | every Observability deployment, Cloud included |

Specs in a config run one at a time, so a flag-off spec doesn't affect the flag-on specs. Each `global.teardown.ts` removes the override.

Specs that need the ux plugin (Classic RUM dashboard, legacy navigation) run on stateful only, because serverless disables it.

## Data

The `ui` and `api` configs share their data in `common/fixtures/`. Each `global.setup.ts` indexes the mock EDOT Browser data (`otel_rum_data.ndjson`) and, on stateful, loads the ux plugin's `rum_test_data` archive (service `elastic-co-frontend`, January 2021). Each `global.teardown.ts` deletes the mock documents by id. Specs pass that time range explicitly.

The API specs assert each application's metrics; the UI specs check what the page shows and how its filters and links behave.

## Running locally

```bash
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/digital_experience/test/scout/ui/playwright.config.ts
node scripts/scout run-tests --arch serverless --domain observability_complete --config x-pack/solutions/observability/plugins/digital_experience/test/scout/ui/playwright.config.ts
```

Use the `api/playwright.config.ts` next to each `ui/` folder for the API specs.
