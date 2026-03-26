## Kibana Security Solution Prebuilt Rules OOM Testing

This folder contains **FTR tests** (Functional Test Runner) designed to expose potential Out of Memory (OOM) issues in Kibana when performing memory-intensive operations related to **Security Solution Prebuilt Rules**.

The tests focus on identifying prebuilt rules package size maximum limit, potential memory leaks or excessive memory usage during operations such as:

- Installing or upgrading prebuilt rule packages

- Installing or upgrading prebuilt rules by using prebuilt rule assets in the package

- Performing related bulk actions

### 💡 Purpose

The goal of these tests is to proactively detect memory exhaustion scenarios by simulating real-world conditions where Kibana operates under constrained memory environments. This helps improve the resilience and stability of the Security Solution features.

### ⚙️ Test Environment Setup

To effectively reproduce OOM-related behavior, the deployment should be created in Elastic Cloud with 1GB RAM limit for the Kibana instance. Elasticsearch instance isn't so important in that testing a reasonable 1GB RAM instance provide sufficient performance for the testing. ML and Integration instances as well as cold and frozen tier Elasticsearch nodes aren't required. An example Elastic Cloud configuration applicable for internal testing framework QAF (QA Framework) looks like the following

```yaml
---
name: '{{ deployment_name }}'
settings:
  autoscaling_enabled: '{{ autoscaling_enabled }}'
metadata:
  system_owned: false
resources:
  elasticsearch:
    - region: '{{ region }}'
      settings:
        dedicated_masters_threshold: 6
      plan:
        cluster_topology:
          - zone_count: 1
            elasticsearch:
              node_attributes:
                data: hot
            instance_configuration_id: gcp.es.datahot.n2.68x10x45
            node_roles:
              - master
              - ingest
              - remote_cluster_client
              - data_hot
              - transform
              - data_content
            id: hot_content
            size:
              value: 1024
              resource: memory
        elasticsearch:
          version: '{{ stack_version }}'
        deployment_template:
          id: gcp-storage-optimized
      ref_id: main-elasticsearch
  enterprise_search: []
  kibana:
    - elasticsearch_cluster_ref_id: main-elasticsearch
      region: '{{ region }}'
      plan:
        cluster_topology:
          - instance_configuration_id: gcp.kibana.n2.68x32x45
            zone_count: 1
            size:
              value: 1024
              resource: memory
        kibana:
          version: '{{ stack_version }}'
          user_settings_yaml: |-
            xpack.securitySolution.prebuiltRulesPackageVersion: '<package-version>'
      ref_id: main-kibana
```

Where `<package-version>` is the package to be installed, e.g. `8.17.4`.

With QAF the config provided above should be placed in `~/.qaf/config/cloud_plans/prebuilt_rules_oom_testing.yml`.

> **_NOTE:_** Make sure to use Cloud First Testing (CFT) regions when creating the testing deployment as these regions support Kibana configuration options like `xpack.securitySolution.prebuiltRulesPackageVersion` or `xpack.fleet.registryUrl` otherwise the choice of configuration options will be restricted to those listed on the [General settings in Kibana page](https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings) and having the "C" icon. The CFT regions are `gcp-us-west2` and `aws-eu-west-1`.

### 🧪 Running the Tests

#### Locally

The easiest way to run the tests locally is using our internal testing framework QAF. Please follow the steps to prepare the environment

- Set up QAF by following to the [instructions](https://docs.elastic.dev/appex-qa/qaf/getting-started) (internal)
- Place the plan configuration provided in [Test Environment Setup](#⚙️-test-environment-setup) in `~/.qaf/config/cloud_plans/prebuilt_rules_oom_testing.yml`
- Create an ECH deployment by running the following command

```bash
qaf elastic-cloud deployments create --stack-version <stack-version> --version-validation --deployment-name <deployment-name> --environment production --no-autoscaling --no-sso --region gcp-us-west2 --plan prebuilt_rules_oom_testing
```

where `<stack-version>` specifies which Elastic Stack version should be deployed (unreleased versions will be deployed from snapshots as a **-SNAPSHOT** version) and `<deployment-name>` specifies a deployment alias required later on to run the tests.

For example a command to create `9.2` Elastic Stack would be

```bash
qaf elastic-cloud deployments create --stack-version 9.2.0 --version-validation --deployment-name prebuilt-rules-oom-test-9.2.0 --environment production --no-autoscaling --no-sso --region gcp-us-west2 --plan prebuilt_rules_oom_testing
```

- Run the tests by running the following command

```bash
qaf kibana ftr run-config --ec-deployment-name <deployment-name> --kibana-repo-root <kibana-root> <kibana-root>/x-pack/solutions/security/test/security_solution_api_integration/test_suites/detections_response/rules_management/prebuilt_rules/oom_testing/configs/ess_basic_license.config.ts
```

where `<kibana-root>` is the absolute path to the Kibana's root folder and `<deployment-name>` is the deployment name used in `qaf elastic-cloud deployments create` to create an Elastic Stack deployment.

### 📁 Test Structure

The tests in this folder include scenarios that:

- Perform repeated or concurrent installations of prebuilt rules

- Trigger large API requests to heavy endpoints (e.g., rule package installation endpoints)

- Each test is expected to either succeed within the memory limit or trigger a recoverable failure. An unexpected crash or unhandled OOM error indicates a potential memory issue.

### ✅ Expected Outcomes

- **Pass**: Kibana completes all operations without OOM crashes.

- **Fail**: Kibana terminates with a fatal OOM error or becomes unresponsive.
