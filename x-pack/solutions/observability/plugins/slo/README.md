# slos

A Kibana plugin

---

## Development

See the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

## Scripts

<dl>
  <dt><code>yarn kbn bootstrap</code></dt>
  <dd>Execute this to install node_modules and setup the dependencies in your plugin and in Kibana</dd>

  <dt><code>yarn plugin-helpers build</code></dt>
  <dd>Execute this to create a distributable version of this plugin that can be installed in Kibana</dd>

  <dt><code>yarn plugin-helpers dev --watch</code></dt>
    <dd>Execute this to build your plugin ui browser side so Kibana could pick up when started in development</dd>
</dl>


## API Integration Tests
The SLO tests are located under `x-pack/test/api_integration/deployment_agnostic/apis/observability/slo` folder. In order to run the SLO tests of your interest, you can grep accordingly. Use the commands below to run all SLO tests (`grep=SLO`) on stateful or serverless.

### Stateful

```
# start server
node scripts/functional_tests_server --config x-pack/test/api_integration/deployment_agnostic/configs/stateful/oblt.stateful.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/test/api_integration/deployment_agnostic/configs/stateful/oblt.stateful.config.ts --grep=SLO
```

### Serverless

```
# start server
node scripts/functional_tests_server --config x-pack/test/api_integration/deployment_agnostic/configs/serverless/oblt.serverless.config.ts

# run tests
node scripts/functional_test_runner --config x-pack/test/api_integration/deployment_agnostic/configs/serverless/oblt.serverless.config.ts --grep=SLO
```
