## Tests Development Process

**Preparation**

- **Environment Deployment** -  Initially, to start tests development, deploy the environment using the [Create Environment](https://github.com/elastic/cloudbeat/blob/main/dev-docs/Cloud-Env-Testing.md) workflow.

- **Configuration & Run** - After provisioning the environment, configure the FTR environment variables accordingly. At a minimum, configure the following variables: TEST_KIBANA_URL, TEST_ES_URL, TEST_CLOUD, ES_SECURITY_ENABLED. More information can be found in the [FTR documentation](https://www.elastic.co/guide/en/kibana/current/development-tests.html#development-functional-tests). Note that URLs should contain the user and password.

``` bash
export TEST_KIBANA_URL=https://elastic:password@my-kbn-cluster.elastic-cloud.com:443
export TEST_ES_URL=https://elastic:password@my-es-cluster.elastic-cloud.com:443

export TEST_CLOUD=1
export ES_SECURITY_ENABLED=1

node scripts/functional_test_runner [--config <config>] [--es-version <instance version>]
```

- **Suite Config** - The config file is located here: `x-pack/test/cloud_security_posture_functional/config.cloud.ts`.


**Final Testing on Demand**

After finishing the implementation and ensuring that the whole suite is working locally, proceed to execution in the Create Environment workflow. [This PR](https://github.com/elastic/cloudbeat/pull/2219) adds the feature to run UI tests. To do this, open a PR in Kibana, then find the PR commit and apply it in the Create Environment workflow for the final end-to-end process. This process takes time, so proceed only after a few local runs to ensure test stability.