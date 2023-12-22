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

# Adding new security area's tests

1. Within the `test_suites` directory, create a new area folder.
2. Introduce `ess.config` and `serverless.config` files to reference the new test files and incorporate any additional custom properties defined in the `CreateTestConfigOptions` interface.
3. In these new configuration files, include references to the base configurations located under the config directory to inherit CI configurations, environment variables, and other settings.
4. Append a new entry in the `ftr_configs.yml` file to enable the execution of the newly added tests within the CI pipeline.


# Testing locally 

In the `package.json` file, you'll find commands to configure the server for each environment and to run tests against that specific environment. These commands adhere to the Mocha tagging system, allowing for the inclusion and exclusion of tags, mirroring the setup of the CI pipeline.

## Running Commands with Different Parameters

In this project, you can run various commands to execute tests and workflows, each of which can be customized by specifying different parameters. Below, how to define the commands based on the parameters and their order.

1.  Server Initialization and running tests for ex: (Detections Response - Default License):
  
    The command structure follows this pattern
    - `<type>` can be either "server" or "runner," allowing you to either set up the server or execute the tests against the designated server.
    - `<area>`: The area the test is defined under, such as "detection_engine, entity_analytics,.."
    - `<licenseFolder>`: The license folder the test is defined under such as "default_license, basic_license,..."

      #### `initialize-server:dr:default`

      - Command: `node ./scripts/index.js server detections_response default_license`
      - Description: Initiates the server for the Detections Response area with the default license.
      #### `run-tests:dr:default`

      - Command: `node ./scripts/index.js runner detections_response default_license`
      - Description: Runs the tests for the Detections Response area with the default license.



 2. Executes particular sets of test suites linked to the designated environment and license:

     The command structure follows this pattern:

      - `<folder>`: The test folder or workflow you want to run.
      - `<projectType>`: The type of project to pick the relevant configurations, either "serverless" or "ess."
        - "serverless" and "ess" help determine the configuration specific to the chosen test.
      - `<environment>`: The testing environment, such as "serverlessEnv," "essEnv," or "qaEnv."
        - When using "serverlessEnv,.." in the script, it appends the correct grep command for filtering tests in the serverless  testing environment.
        - "serverlessEnv,..." is used to customize the test execution based on the serverless environment.

      
      Here are some command examples for "exceptions" which defined under the "detection_engine" area using the default license:

      1. **Run the server for "exception_workflows" in the "serverlessEnv" environment:**
         ```shell
         npm run initialize-server:dr:default exceptions/workflows serverless
         ```
      2. **To run tests for the "exception_workflows" using the serverless runner in the "serverlessEnv" environment, you can use the following command:**
         ```shell
         npm run run-tests:dr:default exceptions/workflows serverless serverlessEnv
         ```
      3. **Run tests for "exception_workflows" using the serverless runner in the "qaEnv" environment:**
         ```shell
         npm run run-tests:dr:default exceptions/workflows serverless qaEnv
         ```
      4. **Run the server for "exception_workflows" in the "essEnv" environment:**
         ```shell
         npm run initialize-server:dr:default exceptions/workflows ess   
         ```
      5. **Run tests for "exception_workflows" using the ess runner in the "essEnv" environment:**   
         ```shell
         npm run run-tests:dr:default exceptions/workflows ess essEnv
      ```