# Observability Onboarding Playwright Tests

These tests are part of the [Nightly CI workflow](https://github.com/elastic/ensemble/actions/workflows/nightly.yml) and do not run on PRs.

Playwright tests are only responsible for UI checks and do not automate onboarding flows fully. On the CI, the missing parts (like executing code snippets on the host) are automated by Ensemble stories, but when running locally you need to do those steps manually.

## Running The Tests Locally

1. Run ES and Kibana
2. Create a `.env` file in the `./x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/` directory with the following content (adjust the values according to your local setup):
```bash
KIBANA_BASE_URL = "http://localhost:5601/ftw"
ELASTICSEARCH_HOST = "http://localhost:9200"
KIBANA_USERNAME = "elastic"
KIBANA_PASSWORD = "changeme"
CLUSTER_ENVIRONMENT = local
ARTIFACTS_FOLDER = ./.playwright
```
1. Run the `playwright test`
```bash
# Assuming the working directory is the root of the Kibana repo
npx playwright test -c ./x-pack/solutions/observability/plugins/observability_onboarding/e2e/playwright/playwright.config.ts --project stateful --reporter list --headed
```
1. Once the test reaches one of the required manual steps, like executing auto-detect command snippet, do the step manually.
2. The test will proceed once the manual step is done.
