# Observability onboarding plugin

This plugin provides an onboarding framework for observability solutions: Logs and APM.

## Stateful onboarding

To run the stateful onboarding flows start Kibana as usual.

## Serverless onboarding

To run the serverless onboarding flows start Kibana using `yarn serverless-oblt`.

## Development

### Unit Tests

Kibana primarily uses Jest for unit testing. Each plugin or package defines a `jest.config.js` that extends a preset provided by the `@kbn/test` package. The following command runs all onboarding unit tests:

```sh
yarn jest --config x-pack/solutions/observability/plugins/observability_onboarding/jest.config.js
```

You can also run a specific test by passing the filepath as an argument, e.g.:

```sh
yarn jest --config x-pack/solutions/observability/plugins/observability_onboarding/jest.config.js x-pack/solutions/observability/plugins/observability_onboarding/public/application/header/custom_header.test.tsx
```

### Deployment-agnostic API tests

The deployment-agnostic API tests are located in [`x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/onboarding`](/x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/onboarding/).

#### Start server and run test (stateful)

```sh
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts --include ./x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/onboarding/index.ts
```

#### Start server and run test (serverless)

```sh
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts --include ./x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/onboarding/index.ts
```

### API integration tests

#### Basic config

```sh
# start server
yarn test:ftr:server --config ./x-pack/test/observability_onboarding_api_integration/basic/config.ts

# run tests
yarn test:ftr:runner --config ./x-pack/test/observability_onboarding_api_integration/basic/config.ts --include ./x-pack/test/observability_onboarding_api_integration/tests/index.ts
```

#### Cloud config

```sh
# start server
yarn test:ftr:server --config ./x-pack/test/observability_onboarding_api_integration/cloud/config.ts

# run tests
yarn test:ftr:runner --config ./x-pack/test/observability_onboarding_api_integration/cloud/config.ts --include ./x-pack/test/observability_onboarding_api_integration/tests/index.ts
```

### Functional Tests

#### Start server and run test (serverless)

```sh
# start server
yarn test:ftr:server --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts

# run tests
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/onboarding/index.ts
```

##### Running Individual Tests

```sh
yarn test:ftr:runner --config ./x-pack/test_serverless/functional/test_suites/observability/config.ts --include ./x-pack/test_serverless/functional/test_suites/observability/onboarding/index.ts/$1
```

### Playwright tests (Scout)

See [./test/scout/README.md](./test/scout/README.md)

### Playwright tests (Ensemble)

See [./e2e/playwright/README.md](./e2e/playwright/README.md)
