# Synthetics

## Purpose

The purpose of this plugin is to provide users of Heartbeat more visibility of what's happening
in their infrastructure.

## Layout

There are three sections to the app, `common`, `public`, and `server`.

### common

Contains runtime types types, constants and a few other files.

Notably, we use `io-ts`/`fp-ts` functions and types to help provide
additional runtime safety for our API requests/responses.

### public

We use Redux and associated tools for managing our app state. Components come in the usual `connect`ed and
presentational varieties.

The `lib` directory controls bootstrapping code and adapter types.

There is a `pages` directory; each view gets its own page component.

### server

The `lib` directory contains `adapters`, which are connections to external resources like Kibana
Server, Elasticsearch, etc. In addition, it contains domains, which are libraries that provide
functionality via adapters.

The `requests` directory contains functions responsible for querying Elasticsearch and parsing its
responses.

There's also a `rest_api` folder that defines the structure of the RESTful API endpoints.

## Testing

### Unit tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

```
yarn test:jest x-pack/solutions/observability/plugins/synthetics
```

### Functional tests server

In one shell, from **~/kibana/x-pack**:
`node scripts/functional_tests_server.js --config {PATH_TO_TEST_SUITE_CONFIG}`

#### API tests

If instead you need to run API tests, start up the test server and then in another shell, from **~kibana/x-pack**:
`node ../scripts/functional_test_runner.js --config test/api_integration/apis/synthetics/config.ts --grep="{TEST_NAME}"`.

You can access the functional test server's Kibana at `http://localhost:5620/`.

You can login with username `elastic` and password `changeme` by default.

If you want to freeze a UI or API test you can include an async call like `await new Promise(r => setTimeout(r, 1000 * 60))`
to freeze the execution for 60 seconds if you need to click around or check things in the state that is loaded.

#### Running --ssl tests

Some of our tests require there to be an SSL connection between Kibana and Elasticsearch.

We can run these tests like described above, but with some special config.

`node scripts/functional_tests_server.js --config=test/functional_with_es_ssl/config.ts`

`node scripts/functional_test_runner.js --config=test/functional_with_es_ssl/config.ts`

## Deployment agnostic API Integration Tests

The Synthetics tests are located under `x-pack/solutions/observability/test/api_integration_deployment_agnostic/apis/synthetics` folder. In order to run the SLO tests of your interest, you can grep accordingly. Use the commands below to run all SLO tests (`grep=SyntheticsAPITests`) on stateful or serverless.

### Stateful

```
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/stateful/oblt.stateful.config.ts --grep=SyntheticsAPITests
```

### Serverless

```
# start server
node scripts/functional_tests_server --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/solutions/observability/test/api_integration_deployment_agnostic/configs/serverless/oblt.serverless.config.ts --grep=SyntheticsAPITests
```
