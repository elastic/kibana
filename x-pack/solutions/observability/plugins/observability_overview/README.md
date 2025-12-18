# Observability Overview plugin

This plugin provides the observability overview page UI.

## Shared navigation

The Observability Overview plugin maintains a navigation registry for Observability solutions, and exposes a shared page template component. Please refer to the docs in [the component directory](public/components/shared/page_template) for more information on registering your solution's navigation structure, and rendering the navigation via the shared component.

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
