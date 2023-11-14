# security_solution_api_integration

This directory serves as a centralized location to place the security solution tests that run in Serverless and ESS environments.

## Subdirectories

1. `config` stores base configurations specific to both the Serverless and ESS environments, These configurations build upon the base configuration provided by `xpack/test_serverless` and `x-pack-api_integrations`, incorporating additional settings such as environment variables and tagging options.


2. `test_suites` directory now houses all the tests along with their utility functions. As an initial step,
we have introduced the `detection_response` directory to consolidate all the integration tests related to detection and response APIs.


## Overview

- In this directory, Mocha tagging is utilized to assign tags to specific test suites and individual test cases. This tagging system enables the ability to selectively apply tags to test suites and test cases, facilitating the exclusion of specific test cases within a test suite as needed.

- There are three primary tags that have been defined: @ess, @serverless, and @brokenInServerless

- Test suites and cases are prefixed with specific tags to determine their execution in particular environments or to exclude them from specific environments. 

ex:
```
 describe('@serverless @ess create_rules', () => { ==> tests in this suite will run in both Ess and Serverless
   describe('creating rules', () => {}); 

   describe('@brokenInServerless missing timestamps', () => {}); ==> tests in this suite will be excluded in Serverless

 ```

## Adding new security area's tests

1. Within the `test_suites` directory, create a new area folder.
2. Introduce `ess.config` and `serverless.config` files to reference the new test files and incorporate any additional custom properties defined in the `CreateTestConfigOptions` interface.
3. In these new configuration files, include references to the base configurations located under the config directory to inherit CI configurations, environment variables, and other settings.
4. Append a new entry in the `ftr_configs.yml` file to enable the execution of the newly added tests within the CI pipeline.


## Testing locally 

In the `package.json` file, you'll find commands to configure the server for each environment and to run tests against that specific environment. These commands adhere to the Mocha tagging system, allowing for the inclusion and exclusion of tags, mirroring the setup of the CI pipeline.

## Running Commands with Different Parameters

In this project, you can run various commands to execute tests and workflows, each of which can be customized by specifying different parameters. Below, how to define the commands based on the parameters and their order.

### Command Structure

The command structure follows this pattern:

- `<command-name>`: The name of the specific command or test case.
- `<folder>`: The test folder or workflow you want to run.
- `<type>`: The type of operation, either "server" or "runner."
- `<environment>`: The testing environment, such as "serverlessEnv," "essEnv," or "qaEnv."
- `<licenseFolder>`: The license folder the test is defined under such as "default_license", by default the value is "default_license"
- `<area>`: The area the test is defined under, such as "detection_engine", by default the value is "detection_engine"

### Serverless and Ess Configuration

- When using "serverless" or "ess" in the script, it specifies the correct configuration file for the tests.
- "Serverless" and "ess" help determine the configuration specific to the chosen test.

### serverlessEnv, essEnv, qaEnv Grep Command

- When using "serverlessEnv,.." in the script, it appends the correct grep command for filtering tests in the serverless testing environment.
- "serverlessEnv,..." is used to customize the test execution based on the serverless environment.


### Command Examples

Here are some command examples using the provided parameters:

1. **Run the server for "exception_workflows" in the "serverlessEnv" environment:**
   ```shell
   npm run initialize-server exceptions/workflows serverless
   ```
2. **To run tests for the "exception_workflows" using the serverless runner in the "serverlessEnv" environment, you can use the following command:**
    ```shell
    npm run run-tests exceptions/workflows serverless serverlessEnv
    ```
3. **Run tests for "exception_workflows" using the serverless runner in the "qaEnv" environment:**
    ```shell
    npm run run-tests exceptions/workflows serverless qaEnv
    ```
4. **Run the server for "exception_workflows" in the "essEnv" environment:**
   ```shell
    npm run initialize-server exceptions/workflows ess
   ```
5. **Run tests for "exception_workflows" using the ess runner in the "essEnv" environment:**   
   ```shell
   npm run run-tests exceptions/workflows ess essEnv
   ```