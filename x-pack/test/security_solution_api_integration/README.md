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





