# Security Serverless Tests

Before considering adding a new Cypress tests, please make sure you have added unit and API tests first and the behaviour can only be exercised with Cypress.

Note that, the aim of Cypress is to test that the user interface operates as expected, hence, you should not be using this tool to test REST API or data contracts.

## Folder Structure

Below you can find the folder structure used on our Cypress tests.

### e2e/

Cypress convention starting version 10 (previously known as integration). Contains the specs that are going to be executed.

### fixtures/

Cypress convention. Fixtures are used as external pieces of static data when we stub responses.

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

## Run tests

Currently serverless tests are not included in any pipeline, so the execution for now should be done in our local machines.

### Visual mode

- Navigate to `x-pack/test_serverless/functional/test_suites/security/cypress`
- Execute `yarn cypress:serverless:open`
- Select `E2E testing`
- Click on `Start E2E testing in chrome`
- Click on the test

### Headless mode

- Navigate to `x-pack/test_serverless/functional/test_suites/security/cypress`
- Execute `yarn cypress:serverless:run`
