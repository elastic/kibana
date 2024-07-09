# observability_solution_api_integration

This directory serves as a centralized location to place the observability solution tests that run in Serverless and ESS environments

## Subdirectories

1. `config` stores base configurations specific to both the Serverless and ESS environments. These configurations build upon the base configuration provided by `x-pack/test_serverless` and `x-pack/test/api_integration`, incorporating additional settings such as environmental variables and tagging options

2. `test_suites` directory houses all the tests along with the utility functions.

## Overview

- In this directory suiteTags is utilized to assign tags to specific test suites. This tagging system enables the ability to selectively apply tags to test suites, facilitating the exclusion of specific test suite as needed.

- Test suites are prefixed with specific tags to determine their execution in particular environments or to exclude them from specific environments.

- We are using the following tags:
    * `@ess`: Runs in an ESS environment (on-prem installation) as part of the CI validation on PRs.

    * `@serverless`: Runs in the first quality gate and in the periodic pipeline.

    * `@skipInEss`: Skipped for ESS environment.

    * `@skipInServerless`: Skipped for all quality gates, CI and periodic pipeline.

ex:
```
describe('SLO - Burn rate rule', function () {
    this.tags(['ess', 'serverless']); // tests in this suite will run in both Ess and Serverless
}

describe('SLO - Burn rate rule', function () {
    this.tags(['skipInServerless']); // tests in this suite will be excluded in Serverless
}
```

# Adding new observabiluty area's tests

1. Within the `test_suites` directory, create a new area folder, for example slos, rules, apm etc
2. Introduce `ess.config` and `serverless.config` files to reference the new test files and incorporate any additional custom properties defined in the `CreateTestConfigOptions` interface.
3. In these new configuration files, include references to the base configurations located under the config directory to inherit CI configurations, environment variables, and other settings.
4. Append a new entry in the `ftr_configs.yml` file to enable the execution of the newly added tests within the CI pipeline.


# Testing locally

In the `package.json` file, you'll find commands to configure the server for each environment and to run tests against that specific environment. These commands adhere to the Mocha tagging system, allowing for the inclusion and exclusion of tags, mirroring the setup of the CI pipeline.

# How to run
You can run various commands with different parameters for the different test worflows.

The command structure follows this pattern:

- `<test>`: The test workflow you want to run.
- `<type>`: The type of operation, either "server" or "runner."
- `<environment>`: The testing environment, such as "serverless," or "ess", specifies the correct configuration file for the tests.

Run the server for "alerting_burn_rate" in the "serverless" environment:

```shell
npm run alerting_burn_rate:server:serverless
```

Run tests for "alerting_burn_rate" in the "serverless" environment:

```shell
npm run alerting_burn_rate:runner:serverless
```

Run the server for "alerting_burn_rate" in the "ess" environment:

```shell
npm run alerting_burn_rate:server:ess
```

Run tests for "alerting_burn_rate" in the "ess" environment:

```shell
npm run alerting_burn_rate:runner:ess
```