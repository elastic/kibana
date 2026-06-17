# Observability plugin

This plugin provides shared components and services for use across observability solutions, as well as the observability landing page UI.

## Rules, Alerts, and Cases

In order to have alert data indexed
you'll need to enable writing in the [Rule Registry plugin](../rule_registry/README.md):

```yaml
xpack.ruleRegistry.write.enabled: true
```

When this is set to `true`, your alerts should show on the alerts page.

## Shared navigation

The Observability plugin maintains a navigation registry for Observability solutions, and exposes a shared page template component. Please refer to the docs in [the component directory](public/components/shared/page_template) for more information on registering your solution's navigation structure, and rendering the navigation via the shared component.

## Exploratory view component

A shared component for visualizing observability data types via lens embeddable. [For further details.](./public/components/shared/exploratory_view/README.md)

## Unit testing

Note: Run the following commands from `kibana/x-pack/plugins/observability`.

### Run unit tests

```bash
npx jest --watch
```

### Update snapshots

```bash
npx jest --updateSnapshot
```

### Coverage

HTML coverage report can be found in target/coverage/jest after tests have run.

```bash
open target/coverage/jest/index.html
```

## API integration testing

API tests run under a trial license (the equivalent of gold+) and have been migrated to Scout. Basic-license behavior is covered by unit tests (see `server/lib/annotations/create_annotations_client.test.ts`).

### Scout API tests

The API tests are located in `test/scout/api/tests`. For fast iteration, start a server once and run Playwright directly against it:

```
# Start a stateful server once (in a separate terminal)
node scripts/scout.js start-server --arch stateful --domain classic

# Run the API tests against the running server
node scripts/playwright test --config x-pack/solutions/observability/plugins/observability/test/scout/api/playwright.config.ts --project=local
```

Alternatively, let Scout start and stop its own servers:

```
node scripts/scout.js run-tests --arch stateful --domain classic --config x-pack/solutions/observability/plugins/observability/test/scout/api/playwright.config.ts
```

### API test tips

- For debugging, access Elasticsearch on `http://localhost:9220` (elastic/changeme).
