# Digital Experience Scout tests

The plugin is behind `xpack.digital_experience.enabled` (default `false`), so both states are tested:

| Folder | Flag | Server config | Deployments (`tags.ts`) |
| --- | --- | --- | --- |
| `scout/` | off | default | every Observability deployment, Cloud included |
| `scout_digital_experience/` | on | `digital_experience` config set | local stateful and serverless Observability Complete |

Specs that need the ux plugin (Classic RUM dashboard, legacy navigation) run on stateful only, because serverless disables it.

## Data

`scout_digital_experience/ui` loads the ux plugin's `rum_test_data` archive in `global.setup.ts` (service `elastic-co-frontend`, January 2021). Specs pass that time range explicitly.

## Running locally

```bash
# Flag off
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/digital_experience/test/scout/ui/playwright.config.ts

# Flag on (the config set is picked from the folder name)
node scripts/scout run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/digital_experience/test/scout_digital_experience/ui/playwright.config.ts
node scripts/scout run-tests --arch serverless --domain observability_complete --config x-pack/solutions/observability/plugins/digital_experience/test/scout_digital_experience/ui/playwright.config.ts
```

Use the `api/playwright.config.ts` next to each `ui/` folder for the API specs.
