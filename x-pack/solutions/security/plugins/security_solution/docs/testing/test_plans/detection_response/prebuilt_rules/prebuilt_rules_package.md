# Test plan: prebuilt rules package <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

## Summary <!-- omit from toc -->

This is a test plan for the workflow of installing and updating the Fleet package with prebuilt rules.

This workflow makes prebuilt rules available for installation and upgrade in the system by the user.

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
  - [Functional requirements](#functional-requirements)
- [Scenarios](#scenarios)
  - [Package installation](#package-installation)
    - [**Scenario: Package is installed via Fleet**](#scenario-package-is-installed-via-fleet)
    - [**Scenario: Package is installed via bundled Fleet package in Kibana**](#scenario-package-is-installed-via-bundled-fleet-package-in-kibana)
    - [**Scenario: Large package can be installed on a memory restricted Kibana instance**](#scenario-large-package-can-be-installed-on-a-memory-restricted-kibana-instance)
  - [Scenarios for the real package](#scenarios-for-the-real-package)
    - [**Scenario: User can install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package**](#scenario-user-can-install-prebuilt-rules-from-scratch-then-install-new-rules-and-upgrade-existing-rules-from-the-new-package)
  - [Kibana upgrade](#kibana-upgrade)
    - [**Scenario: User can use prebuilt rules after upgrading Kibana from version A to B**](#scenario-user-can-use-prebuilt-rules-after-upgrading-kibana-from-version-a-to-b)

## Useful information

### Tickets

- [Rule Immutability/Customization epic](https://github.com/elastic/security-team/issues/1974)(internal)

**Milestone 3 - Prebuilt Rules Customization:**
- [Milestone 3 epic ticket](https://github.com/elastic/kibana/issues/174168)
- [Tests for prebuilt rule upgrade workflow #202078](https://github.com/elastic/kibana/issues/202078)

**Milestone 2:**
- [Ensure full test coverage for existing workflows of installing and upgrading prebuilt rules](https://github.com/elastic/kibana/issues/148176)
- [Write test plan and add test coverage for the new workflows of installing and upgrading prebuilt rules](https://github.com/elastic/kibana/issues/148192)

### Terminology

- **EPR**: [Elastic Package Registry](https://github.com/elastic/package-registry), service that hosts our **Package**.

- **Package**: `security_detection_engine` Fleet package that we use to distribute prebuilt detection rules in the form of `security-rule` assets (saved objects).

- **Real package**: actual latest stable package distributed and pulled from EPR via Fleet.

- **Mock rules**: `security-rule` assets that are indexed into the `.kibana_security_solution` index directly in the test setup, either by using the ES client _in integration tests_ or by an API request _in Cypress tests_.

- **Air-gapped environment**: an environment where Kibana doesn't have access to the internet. In general, EPR is not available in such environments, except the cases when the user runs a custom EPR inside the environment.

- **CTA**: "call to action", usually a button, a link, or a callout message with a button, etc, that invites the user to do some action.
  - CTA to install prebuilt rules - at this moment, it's a link button with a counter (implemented) and a callout with a link button (not yet implemented) on the Rule Management page.
  - CTA to upgrade prebuilt rules - at this moment, it's a tab with a counter (implemented) and a callout with a link button (not yet implemented) on the Rule Management page.

### Assumptions

- Below scenarios only apply to prebuilt detection rules.
- Users should be able to install and upgrade prebuilt rules on the `Basic` license and higher.
- EPR is available for fetching the package unless explicitly indicated otherwise.
- Only the latest **stable** package is checked for installation/upgrade and pre-release packages are ignored.

### Non-functional requirements

- Package installation, rule installation and rule upgrade workflows should work:
  - regardless of the package type: with historical rule versions or without;
  - regardless of the package registry availability: i.e., they should also work in air-gapped environments.
- Rule installation and upgrade workflows should work with packages containing up to 15000 historical rule versions. This is the max number of versions of all rules in the package. This limit is enforced by Fleet.
- Kibana should not crash with Out Of Memory exception during package installation.
- For test purposes, it should be possible to use detection rules package versions lower than the latest.

### Functional requirements

- User should be able to install prebuilt rules with and without previewing what exactly they would install (rule properties).
- User should be able to upgrade prebuilt rules with and without previewing what updates they would apply (rule properties of target rule versions).

## Scenarios

### Package installation

#### **Scenario: Package is installed via Fleet**

**Automation**: 2 e2e tests that install the real package.

```Gherkin
Given the prebuilt rules package is not installed
When user opens any Security Solution page
Then the package gets installed in the background from EPR
```

#### **Scenario: Package is installed via bundled Fleet package in Kibana**

**Automation**: 2 integration tests.

```Gherkin
Given the package is not installed
And user is in an air-gapped environment
When user opens any Security Solution page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a memory restricted Kibana instance**

**Automation**: 1 integration test.

```Gherkin
Given the package is not installed
And the package contains the largest amount of historical rule versions (15000)
And the Kibana instance has a memory heap size of 700 Mb (see note below)
When user opens any Security Solution page
Then the package is installed without Kibana crashing with an Out Of Memory error
```

**Note**: 600 Mb seems to always crash Kibana with an OOM error. 700 Mb runs with no issues in the Flaky test runner with 100 iterations: https://buildkite.com/elastic/kibana-flaky-test-suite-runner/builds/2215.

### Scenarios for the real package

#### **Scenario: User can install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package**

**Automation**: 1 integration test with real packages.

```Gherkin
Given there are two package versions: A and B where A < B
And the package of A version is installed
When user calls the status endpoint
Then it should return a 200 response with some number of rules to install and 0 rules to upgrade
When user calls the installation/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the installation/_perform_ endpoint
Then it should return a 200 response matching the response of the status endpoint
And rules returned in this response should exist as alert saved objects
When user installs version B of the package
Then it should be installed successfully
When user calls the status endpoint
Then it should return a 200 response with some number of new rules to install and some number of rules to upgrade
When user calls the installation/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the installation/_perform_ endpoint
Then rules returned in this response should exist as alert saved objects
When user calls the upgrade/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the upgrade/_perform_ endpoint
Then rules returned in this response should exist as alert saved objects
```

### Kibana upgrade

#### **Scenario: User can use prebuilt rules after upgrading Kibana from version A to B**

**Automation**: not automated, manual testing required.

```Gherkin
Given user is upgrading Kibana from version <A> to version <B>
And the <A> version Kibana instance has already installed prebuilt rules
When the Kibana upgrade is complete
Then user should be able to install new prebuilt rules
And delete installed prebuilt rules
And upgrade installed prebuilt rules that have newer versions in Kibana version <B>

Examples:
  | A      | B     |
  | 8.7    | 8.9.0 |
  | 7.17.x | 8.9.0 |
```
