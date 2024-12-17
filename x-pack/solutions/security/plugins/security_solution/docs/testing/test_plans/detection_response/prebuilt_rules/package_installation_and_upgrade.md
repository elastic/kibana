# Prebuilt Rules Package Installation and Upgrade

This is a test plan for the workflows of installing and updating the Prebuilt Rules package.

> For the test plans for installing and upgrading prebuilt rules, see [Installation of Prebuilt Rules](./installation.md) and [Upgrade of Prebuilt Rules](./upgrade.md).

<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Status: `in progress`. The current test plan matches [Rule Immutability/Customization Milestone 3 epic](https://github.com/elastic/kibana/issues/174168).
=======
Status: `in progress`. The current test plan matches `Milestone 3` of the [Rule Immutability/Customization](https://github.com/elastic/kibana/issues/174168) epic.
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
Status: `in progress`. The current test plan matches [Rule Immutability/Customization Milestone 3 epic](https://github.com/elastic/kibana/issues/174168).
>>>>>>> a71de796f01 (Apply partial suggestions for `package_installation_and_upgrade.md`):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md

## Table of Contents

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
    - [**Scenario: Large package can be installed on a small Kibana instance**](#scenario-large-package-can-be-installed-on-a-small-kibana-instance)
  - [Scenarios for the real package](#scenarios-for-the-real-package)
    - [**Scenario: User can install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package**](#scenario-user-can-install-prebuilt-rules-from-scratch-then-install-new-rules-and-upgrade-existing-rules-from-the-new-package)
  - [Kibana upgrade](#kibana-upgrade)
    - [**Scenario: User can use prebuilt rules after upgrading Kibana from version A to B**](#scenario-user-can-use-prebuilt-rules-after-upgrading-kibana-from-version-a-to-b)

## Useful information

### Tickets

<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
- [Rule Immutability/Customization epic](https://github.com/elastic/security-team/issues/1974)(internal)
=======
- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
- [Rule Immutability/Customization epic](https://github.com/elastic/security-team/issues/1974)(internal)
>>>>>>> a71de796f01 (Apply partial suggestions for `package_installation_and_upgrade.md`):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md

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
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Given the prebuilt rules package is not installed
When user opens any Security Solution page
=======
Given the package is not installed
When user opens the Rule Management page
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
Given the prebuilt rules package is not installed
When user opens any Security Solution page
>>>>>>> a71de796f01 (Apply partial suggestions for `package_installation_and_upgrade.md`):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Then the package gets installed in the background from EPR
```

#### **Scenario: Package is installed via bundled Fleet package in Kibana**

**Automation**: 2 integration tests.

```Gherkin
Given the package is not installed
And user is in an air-gapped environment
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
When user opens any Security Solution page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a memory restricted Kibana instance**
=======
When user opens the Rule Management page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a small Kibana instance**
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
When user opens any Security Solution page
Then the package gets installed in the background from packages bundled into Kibana
```

#### **Scenario: Large package can be installed on a memory restricted Kibana instance**
>>>>>>> a71de796f01 (Apply partial suggestions for `package_installation_and_upgrade.md`):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md

**Automation**: 1 integration test.

```Gherkin
Given the package is not installed
And the package contains the largest amount of historical rule versions (15000)
And the Kibana instance has a memory heap size of 700 Mb (see note below)
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
When user opens any Security Solution page
=======
When user opens the Rule Management page
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
When user opens any Security Solution page
>>>>>>> a71de796f01 (Apply partial suggestions for `package_installation_and_upgrade.md`):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Then the package is installed without Kibana crashing with an Out Of Memory error
```

**Note**: 600 Mb seems to always crash Kibana with an OOM error. 700 Mb runs with no issues in the Flaky test runner with 100 iterations: https://buildkite.com/elastic/kibana-flaky-test-suite-runner/builds/2215.

### Scenarios for the real package

#### **Scenario: User can install prebuilt rules from scratch, then install new rules and upgrade existing rules from the new package**

**Automation**: 1 integration test with real packages.

```Gherkin
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Given there are two package versions: A and B where A < B
And the package of A version is installed
=======
Given there are two package versions: N-1 and N
And the package of N-1 version is installed
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
Given there are two package versions: A and B where A < B
And the package of A version is installed
>>>>>>> 5894739cfd3 (Finish applying suggestions in package_installation_and_upgrade.md):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
When user calls the status endpoint
Then it should return a 200 response with some number of rules to install and 0 rules to upgrade
When user calls the installation/_review endpoint
Then it should return a 200 response matching the response of the status endpoint
When user calls the installation/_perform_ endpoint
Then it should return a 200 response matching the response of the status endpoint
And rules returned in this response should exist as alert saved objects
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
When user installs version B of the package
=======
When user installs the package of N version
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
When user installs version B of the package
>>>>>>> 5894739cfd3 (Finish applying suggestions in package_installation_and_upgrade.md):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
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
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
And the <A> version Kibana instance has already installed prebuilt rules
When the Kibana upgrade is complete
Then user should be able to install new prebuilt rules
And delete installed prebuilt rules
And upgrade installed prebuilt rules that have newer versions in Kibana version <B>
<<<<<<< HEAD:x-pack/solutions/security/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
And the <A> instance contains already installed prebuilt rules
When the upgrade is complete
=======
And the <A> version Kibana instance has already installed prebuilt rules
When the Kibana upgrade is complete
>>>>>>> 5894739cfd3 (Finish applying suggestions in package_installation_and_upgrade.md):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
Then user should be able to install new prebuilt rules
And delete installed prebuilt rules
And upgrade installed prebuilt rules that have newer versions in <B>
>>>>>>> d44834d79cd (Split test install+upgrade test plans into 3):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md
=======
>>>>>>> b19262ad8ea (fix):x-pack/plugins/security_solution/docs/testing/test_plans/detection_response/prebuilt_rules/package_installation_and_upgrade.md

Examples:
  | A      | B     |
  | 8.7    | 8.9.0 |
  | 7.17.x | 8.9.0 |
```
