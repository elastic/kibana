# Digital Experience Scout tests

The plugin is behind the `digitalExperience.enabled` feature flag (default `false`). All specs run on the default Scout server, and switch the flag at runtime with `apiServices.core.settings` (`feature_flags.overrides`):

Each spec sets the flag it needs in `beforeAll` and removes the override in `afterAll`, so it doesn't depend on the order specs run in:

| Specs | Flag | Deployments (`tags.ts`) |
| --- | --- | --- |
| Flag-on (most specs) | `FLAG_ON_OVERRIDE` | local stateful and serverless Observability Complete |
| Flag-off (`feature_disabled`, `app_access_disabled`, `navigation_disabled`) | `FLAG_OFF_OVERRIDE` | local stateful and serverless Observability Complete and Logs Essentials |

All specs are local only: `apiServices.core.settings` calls `PUT /internal/core/_settings`, which Kibana only registers with `coreApp.allowDynamicConfigOverrides`, and Cloud deployments don't set it.

Specs in a config run one at a time, so one spec's flag doesn't leak into another. Each `global.teardown.ts` also removes the override, in case a spec stopped before its `afterAll`.

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
