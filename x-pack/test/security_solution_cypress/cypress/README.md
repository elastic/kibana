# Cypress Tests

The `security_solution/cypress` directory contains functional UI tests that execute using [Cypress](https://www.cypress.io/).

Currently with Cypress you can develop `functional` tests.

If you are still having doubts, questions or queries, please feel free to ping our Cypress champions:

- Functional Tests:
  - Gloria Hornero and Patryk Kopycinsky

## Table of Contents

[**How to add a new Cypress test**](#how-to-add-a-new-cypress-test)

[**Running the tests**](#running-the-tests)

[**Enabling Experimental Flags**](#enabling-experimental-flags)

[**Debugging your test**](#debugging-your-test)

[**Folder structure**](#folder-structure)

[**Test data**](#test-data)

[**Serverless**](#serverless)

[**Development Best Practices**](#development-best-practices)

[**Test Artifacts**](#test-artifacts)

[**Linting**](#linting)

## How to add a new Cypress test

Before considering adding a new Cypress tests, please make sure you have added unit and API tests first. Note that, the aim of Cypress
is to test that the user interface operates as expected, hence, you should not be using this tool to test REST API or data contracts.

First take a look to the [**Development Best Practices**](#development-best-practices) section.
Then check [**Folder structure**](#folder-structure) section to know where is the best place to put your test, [**Test data**](#test-data) section if you need to create any type
of data for your test, [**Running the tests**](#running-the-tests) to know how to execute the tests and [**Debugging your test**](#debugging-your-test) to debug your test if needed.

Please, before opening a PR with the new test, please make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

Note that we use tags in order to select which tests we want to execute:

- `@serverless` includes a test in the Serverless test suite for PRs (the so-called first quality gate) and QA environment for the periodic pipeline. You need to explicitly add this tag to any test you want to run in CI for serverless. 
- `@serverlessQA` includes a test in the Serverless test suite for the Kibana release process of serverless. You need to explicitly add this tag to any test you want you run in CI for the Kibana QA quality gate. These tests should be stable, otherwise they will be blocking the release pipeline. They should be also critical enough, so that when they fail, there's a high chance of an SDH or blocker issue to be reported.
- `@ess` includes a test in the normal, non-Serverless test suite. You need to explicitly add this tag to any test you want to run against a non-Serverless environment.
- `@skipInEss` excludes a test from the non-Serverless test suite. The test will not be executed as part for the PR process. All the skipped tests should have a link to a ticket describing the reason why the test got skipped.
- `@skipInServerlessMKI` excludes a test from the execution on any MKI environment (even if it's tagged as `@serverless` or `@serverlessQA`). Could indicate many things, e.g. "the test is flaky in Serverless MKI", "the test has been temporarily excluded, see the comment above why". All the skipped tests should have a link to a ticket describing the reason why the test got skipped.
- `@skipInServerless` excludes a test from the Serverless test suite and Serverless QA environment for both, periodic pipeline and Kibana QA quality gate (even if it's tagged as `@serverless`). Could indicate many things, e.g. "the test is flaky in Serverless", "the test is Flaky in any type of environment", "the test has been temporarily excluded, see the comment above why". All the skipped tests should have a link to a ticket describing the reason why the test got skipped.

Please, before opening a PR with a new test, make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

## Running the tests

### Run them locally
When running the tests, FTR is used to spawn both a Kibana instance (http://localhost:5620) and an Elasticsearch instance (http://localhost:9220) with a preloaded minimum set of data (see preceding "Test data" section).

Run the tests with the following yarn scripts from `x-pack/test/security_solution_cypress`:

| Script Name | Description |
| ----------- | ----------- |
| cypress | Runs the default Cypress command |
| cypress:open:ess | Opens the Cypress UI with all tests in the `e2e` directory. This also runs a local kibana and ES instance. The kibana instance will reload when you make code changes. This is the recommended way to debug and develop tests. |
| cypress:open:serverless | Opens the Cypress UI with all tests in the `e2e` directory. This also runs a mocked serverless environment. The kibana instance will reload when you make code changes. This is the recommended way to debug and develop tests. |
| cypress:run:entity_analytics:ess | Runs all tests tagged as ESS placed in the `e2e/entity_analytics` directory in headless mode |
| cypress:run:cases:ess | Runs all tests under `explore/cases` in the `e2e` directory related to the Cases area team in headless mode |
| cypress:ess | Runs all ESS tests with the specified configuration in headless mode and produces a report using `cypress-multi-reporters` |
| cypress:rule_management:run:ess | Runs all tests tagged as ESS in the `e2e/detection_response/rule_management` excluding `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:rule_management:prebuilt_rules:run:ess | Runs all tests tagged as ESS in the `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:run:respops:ess | Runs all tests related to the Response Ops area team, specifically tests in `detection_alerts`, `detection_rules`, and `exceptions` directories in headless mode |
| cypress:run:entity_analytics:serverless | Runs all tests tagged as SERVERLESS in the `e2e/entity_analytics` directory in headless mode |
| cypress:rule_management:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management` excluding `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:rule_management:prebuilt_rules:run:serverless | Runs all tests tagged as ESS in the `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:detection_engine:run:ess | Runs all tests tagged as ESS in the `e2e/detection_response/detection_engine` excluding `e2e/detection_response/detection_engine/exceptions` directory in headless mode |
| cypress:detection_engine:exceptions:run:ess | Runs all tests tagged as ESS in the `e2e/detection_response/detection_engine/exceptions` directory in headless mode |
| cypress:detection_engine:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/detection_engine` excluding `e2e/detection_response/detection_engine` directory in headless mode |
| cypress:ai_assistant:run:ess | Runs all tests tagged as ESS in the `e2e/ai_assistant` directory in headless mode |
| cypress:ai_assistant:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/ai_assistant` directory in headless mode |
| cypress:cloud_security_posture:run:ess | Runs all tests tagged as ESS in the `e2e/cloud_security_posture` directory in headless mode |
| cypress:cloud_security_posture:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/cloud_security_posture` directory in headless mode |
| cypress:detection_engine:exceptions:run:serverless | Runs all tests tagged as ESS in the `e2e/detection_response/detection_engine/exceptions` directory in headless mode |
| cypress:investigations:run:ess | Runs all tests tagged as SERVERLESS in the `e2e/investigations` directory in headless mode |
| cypress:explore:run:ess | Runs all tests tagged as ESS in the `e2e/explore` directory in headless mode |
| cypress:investigations:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/investigations` directory in headless mode |
| cypress:explore:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/explore` directory in headless mode |
| cypress:open:qa:serverless | Opens the Cypress UI with all tests in the `e2e` directory tagged as SERVERLESS. This also creates an MKI project in console.qa enviornment. The kibana instance will reload when you make code changes. This is the recommended way to debug tests in QA. Follow the readme in order to learn about the known limitations. |
| cypress:run:qa:serverless:entity_analytics | Runs all tests tagged as SERVERLESS placed in the `e2e/entity_analytics` directory in headless mode using the QA environment and real MKI projects.|
| cypress:run:qa:serverless:explore | Runs all tests tagged as SERVERLESS in the `e2e/explore` directory in headless mode using the QA environment and real MKI prorjects. |
| cypress:run:qa:serverless:investigations | Runs all tests tagged as SERVERLESS in the `e2e/investigations` directory in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:cloud_security_posture | Runs all tests tagged as SERVERLESS in the `e2e/cloud_security_posture` directory in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:rule_management | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management` directory, excluding `e2e/detection_response/rule_management/prebuilt_rules` in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:rule_management:prebuilt_rules | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:detection_engine | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/detection_engine` directory, excluding `e2e/detection_response/detection_engine/exceptions` in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:detection_engine:exceptions | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/detection_engine/exceptions` directory in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:ai_assistant | Runs all tests tagged as SERVERLESS in the `e2e/ai_assistant` directory in headless mode using the QA environment and reak MKI projects. |
| junit:merge | Merges individual test reports into a single report and moves the report to the `junit` directory |

Please note that all the headless mode commands do not open the Cypress UI and are typically used in CI/CD environments. The scripts that open the Cypress UI are useful for development and debugging.

### Enabling experimental flags

When writing a test that requires an experimental flag enabled, you need to pass an extra configuration to the header of the test:

```typescript
describe(
  'My Experimental Flag test',
  {
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'MY_EXPERIMENTAL_FLAG',
          ])}`,
        ],
      },
    },
  },
  // ...
);
```

Note that this configuration doesn't work for local development. In this case, you need to update the configuration files: `../config` and `../serverless_config`, but you shouldn't commit these changes.

## Debugging your test

In order to be able to debug any Cypress test you need to open Cypress on visual mode. [Here](https://docs.cypress.io/guides/guides/debugging)
you can find an extended guide about how to proceed.

If you are debugging a flaky test, a good tip is to insert a `cy.wait(<some long milliseconds>)` around async parts of the tes code base, such as network calls which can make an indeterministic test, deterministically fail locally.

## Folder Structure

Below you can find the folder structure used on our Cypress tests.

### e2e/

Cypress convention starting version 10 (previously known as integration). Contains the specs that are going to be executed.

### Area teams folders

These directories contain tests which are run in their own Buildkite pipeline. 

If you belong to one of the teams listed in the table, please add new e2e specs to the corresponding directory.

| Directory | Area team |
| -- | -- |
| `e2e/explore` | Threat Hunting Explore |
| `e2e/investigations` | Threat Hunting Investigations |
| `e2e/detection_response/rule_management` | Detection Rule Management |
| `e2e/detection_response/detection_engine` | Detection Engine |
| `e2e/ai_assistant` | AI Assistant |
| `e2e/entity_analytics` | Entity Analytics |
| `e2e/asset_inventory` | Cloud Security Posture |


### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

### plugins/

Cypress convention. As a convenience, by default Cypress will automatically include the plugins file cypress/plugins/index.js before every single spec file it runs.

### objects/

Contains representations of data used across different tests; our domain objects.

### screens/

Contains the elements we want to interact with in our tests.

Each file inside the screens folder represents a screen in our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- screens
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### tasks/

_Tasks_ are functions that may be reused across tests.

Each file inside the tasks folder represents a screen of our application. When the screens are complex, e.g. Hosts with its multiple tabs, the page is represented by a folder and the different important parts are represented by files.

Example:

- tasks
  - hosts
    - all_hosts.ts
    - authentications.ts
    - events.ts
    - main.ts
    - uncommon_processes.ts

### urls/

Represents all the URLs used during the tests execution.

## Test data

The data the tests need:

- Is generated on the fly using our application APIs (preferred way)
- Is ingested on the ELS instance using the `es_archiver` utility

By default, when running the tests in Jenkins mode, a base set of data is ingested on the ELS instance: a set of auditbeat data (the `auditbeat` archive). This is usually enough to cover most of the scenarios that we are testing.

### How to generate a new archive

**Note:** As mentioned above, archives are only meant to contain external data, e.g. beats data. Due to the tendency for archived domain objects (rules, signals) to quickly become out of date, it is strongly suggested that you generate this data within the test, through interaction with either the UI or the API.

We use es_archiver to manage the data that our Cypress tests need.

1. Set up a clean instance of kibana and elasticsearch (if this is not possible, try to clean/minimize the data that you are going to archive).
2. With the kibana and elasticsearch instance up and running, create the data that you need for your test.
3. When you are sure that you have all the data you need run the following command from: `x-pack/test/security_solution_cypress`

```sh
node ../../../scripts/es_archiver save <nameOfTheFolderWhereDataIsSaved> <indexPatternsToBeSaved>  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.base.js --es-url http://<elasticsearchUsername>:<elasticsearchPassword>@<elasticsearchHost>:<elasticsearchPort>
```

Example:

```sh
node ../../../scripts/es_archiver save custom_rules ".kibana",".siem-signal*"  --dir ../../test/security_solution_cypress/es_archives --config ../../../test/functional/config.base.js --es-url http://elastic:changeme@localhost:9220
```

Note that the command will create the folder if it does not exist.

### Using an archive from within the Cypress tests

Task [cypress/support/es_archiver.ts](https://github.com/elastic/kibana/blob/main/x-pack/test/security_solution_cypress/cypress/support/es_archiver.ts) provides helpers such as `esArchiverLoad` and `esArchiverUnload` by means of `es_archiver`'s CLI.

Archives used only for Cypress tests purposes are stored in `x-pack/test/security_solution_cypress/es_archives` and are used as follow on the tests.

```typescript
cy.task('esArchiverLoad', { archiveName: 'overview' });
cy.task('esArchiverUnload', { archiveName: 'overview'});

```

You can also use archives located in `x-pack/test/functional/es_archives/security_solution` by specifying `type: 'ftr'` in the archiver tasks:

```typescript
// loads then unloads from x-pack/test/functional/es_archives/security_solution/alias
cy.task('esArchiverLoad', { archiveName: 'alias', type: 'ftr'});
cy.task('esArchiverUnload', { archiveName: 'alias', type:'ftr'});
```

## Serverless

Note that we use tags in order to select which tests we want to execute, if you want a test to be executed on serverless you need to add @serverless tag to it.


### Running serverless tests locally pointing to FTR serverless (First Quality Gate) 

Run the tests with the following yarn scripts from `x-pack/test/security_solution_cypress`:

| Script Name | Description |
| ----------- | ----------- |
| cypress:open:serverless | Opens the Cypress UI with all tests in the `e2e` directory. This also runs a mocked serverless environment. The kibana instance will reload when you make code changes. This is the recommended way to debug and develop tests. |
| cypress:entity_analytics:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/entity_analytics` directory in headless mode |
| cypress:investigations:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/investigations` directory in headless mode |
| cypress:explore:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/explore` directory in headless mode |
| cypress:rule_management:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management` excluding `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:rule_management:prebuilt_rules:run:serverless | Runs all tests tagged as ESS in the `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode |
| cypress:ai_assistant:run:serverless | Runs all tests tagged as SERVERLESS in the `e2e/ai_assistant` directory in headless mode |

Please note that all the headless mode commands do not open the Cypress UI and are typically used in CI/CD environments. The scripts that open the Cypress UI are useful for development and debugging.

#### PLIs
When running serverless Cypress tests, the following PLIs are set by default:

```
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
```

With the above configuration we'll be able to cover most of the scenarios, but there are some cases were we might want to use a different configuration. In that case, we just need to pass to the header of the test, which is the configuration we want for it.

```typescript
describe(
  'Entity Analytics Dashboard in Serverless',
  {
    tags: '@serverless',
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  });
```

Per the way we set the environment during the execution process on CI, the above configuration is going to be valid when the test is executed on headless mode.

For test developing or test debugging purposes, you need to modify the configuration but without committing and pushing the changes in `x-pack/test/security_solution_cypress/serverless_config.ts`.

#### Custom Roles

Custom roles for serverless is currently supported only for stateless environments (non MKI environments).

##### Creating a Custom Role

To create a custom role, use the Cypress task `createServerlessCustomRole`. This task requires two parameters:
- **`roleDescriptor`**: Defines the permissions and access for the role.
- **`roleName`**: A unique name for the custom role.

Example:

```typescript
const roleDescriptor = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

cy.task('createServerlessCustomRole', { roleDescriptor, roleName: 'customRole' });
```

##### Using a Custom Role

Once the custom role is created, you can log in to the application using your regular `login`` method and passing the name of the role.

```typescript
login('customRole');
```


##### Deleting a Custom Role

After your tests, always delete the custom role to ensure a clean environment. Use the `deleteServerlessCustomRole` task and provide the name of the role as the parameter.

```typescript
cy.task('deleteServerlessCustomRole', 'customRole');
```

##### Full workflow

Here’s the complete workflow for creating, using, and deleting a custom role:

```typescript
const roleDescriptor = {
  elasticsearch: {
    cluster: ['monitor'],
    indices: [{ names: ['*'], privileges: ['read'] }],
  },
  kibana: [
    {
      base: ['all'],
      feature: {},
      spaces: ['*'],
    },
  ],
};

before(() => {
  cy.task('createServerlessCustomRole', { roleDescriptor, roleName: 'customRole' });
});

beforeEach(() => {
  login('customRole');
});

after(() => {
  cy.task('deleteServerlessCustomRole', 'customRole');
});
```

### Running serverless tests locally pointing to a MKI project created in QA environment

Note that when using any of the below scripts, the tests are going to be executed through an MKI project with the version that is currently available in QA. If you need to use
a specific commit (i.e. debugging a failing tests on the periodic pipeline), check the section: `Running serverless tests locally pointing to a MKI project created in QA environment with an overridden image`.

Run the tests with the following yarn scripts from `x-pack/test/security_solution_cypress`: 

| Script Name | Description |
| ----------- | ----------- |
| cypress:open:qa:serverless | Opens the Cypress UI with all tests in the `e2e` directory tagged as SERVERLESS. This also creates an MKI project in console.qa enviornment. The kibana instance will reload when you make code changes. This is the recommended way to debug tests in QA. Follow the readme in order to learn about the known limitations. |
| cypress:run:qa:serverless | Runs all tests tagged as SERVERLESS placed in the `e2e` directory excluding `investigations` and `explore` directories in headless mode using the QA environment and real MKI projects.|
| cypress:run:qa:serverless:explore | Runs all tests tagged as SERVERLESS in the `e2e/explore` directory in headless mode using the QA environment and real MKI prorjects. |
| cypress:run:qa:serverless:investigations | Runs all tests tagged as SERVERLESS in the `e2e/investigations` directory in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:rule_management | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management` directory, excluding `e2e/detection_response/rule_management/prebuilt_rules` in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:rule_management:prebuilt_rules | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/rule_management/prebuilt_rules` directory in headless mode using the QA environment and real MKI projects. |
| cypress:run:qa:serverless:detection_engine | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/detection_engine` directory, excluding `e2e/detection_response/detection_engine/exceptions` in headless mode using the QA environment and reak MKI projects. |
| cypress:run:qa:serverless:detection_engine:prebuilt_rules | Runs all tests tagged as SERVERLESS in the `e2e/detection_response/detection_engine/exceptions` directory in headless mode using the QA environment and real MKI projects. |
| cypress:run:qa:serverless:ai_assistant | Runs all tests tagged as SERVERLESS in the `e2e/ai_assistant` directory in headless mode using the QA environment and reak MKI projects. |


Please note that all the headless mode commands do not open the Cypress UI and are typically used in CI/CD environments. The scripts that open the Cypress UI are useful for development and debugging.


#### Setup required

Setup a valid Elastic Cloud API key for QA environment:

1. Navigate to QA environment.
2. Click on the `User menu button` located on the top right of the header.
3. Click on `Organization`.
4. Click on the `API keys` tab.
5. Click on `Create API key` button.
6. Add a name, set an expiration date, assign an organization owner role.
7. Click on `Create API key`
8. Save the value of the key

Store the saved key on `~/.elastic/cloud.json` using the following format:

```json
{
  "api_key": {
    "qa": "<API_KEY>"
  }
}
```

By default all our Serverless tests are executed with the `platform_engineer` role. 

So you need to add to your organization a new user that has the required role. You can achieve that by using email aliases.

Store the email and password of the account of the `platform_engineer` user at the root directory of your Kibana project on `.ftr/role_users.json`, using the following format:

```json
{
  "platform_engineer": {
    "email": "<email>",
    "password": "<password>"
  }
}
```

### Running serverless tests locally pointing to a MKI project created in QA environment with an overridden image

In order to execute Cypress using a project wih an overridden image, you need to first make sure that the image is created (if you need to debug a failing test of the periodic pipeline, the image is already created you just need to check the commit that was used).

In order to check for the existance of an image check: https://container-library.elastic.co/r/kibana-ci, if the image with the commit you want to use does not exist **DON'T USE THE COMMIT FLAG SINCE YOU MAY CAUSE A MAJOR ISSUE IN CONTROL PLANE > CAUSE A BULK OF ALERTS IN CONTROL PLANE** and the project will not be functional.

You need to have everything setup as mentioned above in `Setup required`. Once the setup is ready you just need to execute Cypress with the following option:

```
yarn cypress:open:qa:serverless --commit <commitHash>
```


#### Testing with different roles 

If you want to execute a test using Cypress on visual mode with MKI, you need to make sure you have the user created in your organization, and add it tot he `.ftr/role_users.json`:

```json
{
  "platform_engineer": {
    "email": "<email>",
    "password": "<password>"
  },
  "<roleName>": {
    "email": "<email>",
    "password": "<password>"
  }
}
```

As role names please use:
- admin
- detections_admin
- editor
- endpoint_operations_analyst
- endpoint_policy_manager
- none
- platform_engineer
- rule_author
- soc_manager
- t1_analyst
- t2_analyst
- t3_analyst
- threat_intelligence_analyst
- viewer

The above should be the same used on the automation.

#### PLIs

When running serverless Cypress tests on QA environment, the following PLIs are set by default:
```
      { product_line: 'security', product_tier: 'complete' },
      { product_line: 'endpoint', product_tier: 'complete' },
      { product_line: 'cloud', product_tier: 'complete' },
```

With the above configuration we'll be able to cover most of the scenarios, but there are some cases were we might want to use a different configuration. In that case, we just need to pass to the header of the test, which is the configuration we want for it.

```typescript
describe(
  'Entity Analytics Dashboard in Serverless',
  {
    tags: '@serverless',
    env: {
      ftrConfig: {
        productTypes: [
          { product_line: 'security', product_tier: 'essentials' },
          { product_line: 'endpoint', product_tier: 'essentials' },
        ],
      },
    },
  });
```

For test developing or test debugging purposes on QA, you have avaialable the following options:

```
yarn cypress:open:qa:serverless --tier <essentials|complete>
```

The above command will open the Cypress UI with all tests in the `e2e` directory tagged as SERVERLESS. This also creates an MKI project in console.qa enviornment with the passed tier essentials or complete. If no flag is passed, the project will be cretaed as complete.

```
yarn cypress:open:qa:serverless --no-endpoint-addon
```

The above command will open the Cypress UI with all tests in the `e2e` directory tagged as SERVERLESS. This also creates an MKI project in console.qa enviornment without the endpoint add-on.

```
yarn cypress:open:qa:serverless --no-cloud-addon
```

The above command will open the Cypress UI with all tests in the `e2e` directory tagged as SERVERLESS. This also creates an MKI project in console.qa enviornment without the cloud add-on.

Note that all the above flags can be combined.


## Development Best Practices

Below you will a set of best practices that should be followed when writing Cypress tests.

### For serverless
Reuse just those tests that have the SAME exact behaviour and steps. Take the necessity of adding a conditional to the test to make it pass in order to, perform a different set of steps, setup, or assertions, as a signal for the need of a serverless 
specific test.

### Avoid forced actions

Cypress action commands like `click()`, `type()` and etc allow to pass `force` flag which is set to `false` by default. Avoid passing the `force` flag as it leads to swallowing some UI bugs. If it's impossible to perform an action without forcing it make sure to add an explanation comment and create a ticket to don't forget to fix it later on. The same is applicable to adding an extra `click()` before `type()` command. `type()` clicks an input once and types after so an extra `click()` usually means there is a problem.

### Write easy to maintain tests

Consider to extract all the elements you need to interact with to the `screens` folder. In this way in case the locator changes, we just need to update the value in one place.

### Write easy to read tests

Consider to extract all the tasks a user should perfom into the `tasks` folder. In this way is going to be easier to undertsand what are we trying to mimic from the user perspective. Also in case there is change on the way the user has to perform the action, we just need to update the value in one place.

### Make sure your test fails

Before open a PR with a new test, please first make sure that the test fails. If you never see your test fail you don’t know if your test is actually testing the right thing, or testing anything at all.

### Minimize the use of es_archive

When possible, create all the data that you need for executing the tests using the application APIS or the UI.

### Speed up test execution time

Loading the web page takes a big amount of time, in order to minimize that impact, the following points should be
taken into consideration until another solution is implemented:

- Group the tests that are similar in different contexts.
- For every context login only once, clean the state between tests if needed without re-loading the page.
- All tests in a spec file must be order-independent.
- Clean up the state and data just when needed using `cleanKibana` function. Executing this function takes a lot of time, so consider if you really need to clean the data before the execution. I.e: If you are just checking that a modal can be opened, you may not need to clean the data.

Remember that minimizing the number of times the web page is loaded, we minimize as well the execution time.

## Test Artifacts

When Cypress tests are run headless on the command line, artifacts
are generated under the `target` directory in the root of Kibana as follows:

- HTML Reports
  - location: `target/kibana-security-solution/cypress/results/output.html`
- `junit` Reports
  - location: `target/kibana-security-solution/cypress/results`
- Screenshots (of failed tests)
  - location: `target/kibana-security-solution/cypress/screenshots`
- Videos
  - disabled by default, can be enabled by setting env var `CYPRESS_video=true`
  - location: `target/kibana-security-solution/cypress/videos`

## Linting

Optional linting rules for Cypress and linting setup can be found [here](https://github.com/cypress-io/eslint-plugin-cypress#usage)
