## The Reporting Tests

### Overview

Reporting tests have their own top level test folder because: the current API tests run with `optimize.enabled=false` flag for performance reasons, but reporting actually requires UI assets.

  ### Running the tests

  You need to specify a reporting configuration file. Reporting currently has two configuration files you can point to:
  - test/reporting/configs/chromium_api.js
  - test/reporting/configs/generate_api.js

  The tests hit the reporting API and ensure report generation completes successfully, but does not verify the output of the reports.

  To run the tests in a single command. :
1. run:
  ```
node scripts/functional_tests --config x-pack/test/reporting/configs/[config_file_name_here].js
  ```

 You can also run the test server seperately from the runner. This is beneficial when debugging as Kibana and Elasticsearch will remain up and running throughout multiple test runs. To do this:

1. In one terminal window, run:
  ```
node scripts/functional_tests_server.js --config x-pack/test/reporting/configs/[test_config_name_here].js
  ```
2. In another terminal window, cd into x-pack dir and run:
  ```
node ../scripts/functional_test_runner.js --config x-pack/test/reporting/configs/[test_config_name_here].js
  ```