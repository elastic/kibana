# Test plan: prebuilt rule upgrade notifications <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, get started [here](./prebuilt_rules.md) and check an overview of the features of prebuilt rules in [this section](./prebuilt_rules_common_info.md#features).

## Summary <!-- omit from toc -->

This is a test plan for the functionality of showing notifications about:

- Rule Management page: some of the currently installed prebuilt rules can be upgraded to new versions.
- Rule Details page: the rule shown on this page can be upgraded to a new version.
- Rule Editing page: the rule shown on this page can be upgraded to a new version.

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
- [Requirements](#requirements)
  - [Assumptions](#assumptions)
  - [Technical requirements](#technical-requirements)
  - [Product requirements](#product-requirements)
- [Scenarios](#scenarios)
  - [Rule upgrade notifications on the Rule Management page](#rule-upgrade-notifications-on-the-rule-management-page)
    - [**Scenario: User is NOT notified when all installed prebuilt rules are up to date**](#scenario-user-is-not-notified-when-all-installed-prebuilt-rules-are-up-to-date)
    - [**Scenario: User is notified when some prebuilt rules can be upgraded**](#scenario-user-is-notified-when-some-prebuilt-rules-can-be-upgraded)
    - [**Scenario: User is notified when both rules to install and upgrade are available**](#scenario-user-is-notified-when-both-rules-to-install-and-upgrade-are-available)
    - [**Scenario: User doesn't see the Rule Updates tab until the package installation is completed**](#scenario-user-doesnt-see-the-rule-updates-tab-until-the-package-installation-is-completed)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Tests for prebuilt rule upgrade workflow](https://github.com/elastic/kibana/issues/202078)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).

### Technical requirements

Non-functional requirements for the functionality outlined in this test plan.

- [Common technical requirements](./prebuilt_rules_common_info.md#common-technical-requirements).

### Product requirements

Functional requirements for the functionality outlined in this test plan.

- [Common product requirements](./prebuilt_rules_common_info.md#common-product-requirements).

User stories:

- TBD

## Scenarios

### Rule upgrade notifications on the Rule Management page

#### **Scenario: User is NOT notified when all installed prebuilt rules are up to date**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given all the latest prebuilt rules are installed in Kibana
When user opens the Rule Management page
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Rule Updates table
```

#### **Scenario: User is notified when some prebuilt rules can be upgraded**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
```

#### **Scenario: User is notified when both rules to install and upgrade are available**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are Y more prebuilt rules available to install
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
```

#### **Scenario: User doesn't see the Rule Updates tab until the package installation is completed**

**Automation**: unit tests.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Rule Management page
Then user should NOT see the Rule Updates tab until the package installation is completed and there are rules available for upgrade
```
