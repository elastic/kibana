# Test plan: installing prebuilt rules <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, get started [here](./prebuilt_rules.md) and check an overview of the features of prebuilt rules in [this section](./prebuilt_rules_common_info.md#features).

## Summary <!-- omit from toc -->

This is a test plan for the workflows of:

- installing single prebuilt rules one-by-one
- installing multiple prebuilt rules in bulk

from the Rule Installation page.

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
  - [Rule installation notifications on the Rule Management page](#rule-installation-notifications-on-the-rule-management-page)
    - [**Scenario: User is NOT notified when no prebuilt rules are installed and there are no prebuilt rules assets**](#scenario-user-is-not-notified-when-no-prebuilt-rules-are-installed-and-there-are-no-prebuilt-rules-assets)
    - [**Scenario: User is NOT notified when all prebuilt rules are installed and up to date**](#scenario-user-is-not-notified-when-all-prebuilt-rules-are-installed-and-up-to-date)
    - [**Scenario: User is notified when no prebuilt rules are installed and there are rules available to install**](#scenario-user-is-notified-when-no-prebuilt-rules-are-installed-and-there-are-rules-available-to-install)
    - [**Scenario: User is notified when some prebuilt rules can be installed**](#scenario-user-is-notified-when-some-prebuilt-rules-can-be-installed)
    - [**Scenario: User is notified when both rules to install and upgrade are available**](#scenario-user-is-notified-when-both-rules-to-install-and-upgrade-are-available)
    - [**Scenario: User is notified after a prebuilt rule gets deleted**](#scenario-user-is-notified-after-a-prebuilt-rule-gets-deleted)
  - [Rule installation workflow: base cases](#rule-installation-workflow-base-cases)
    - [**Scenario: User can install prebuilt rules one by one**](#scenario-user-can-install-prebuilt-rules-one-by-one)
    - [**Scenario: User can install multiple prebuilt rules selected on the page**](#scenario-user-can-install-multiple-prebuilt-rules-selected-on-the-page)
    - [**Scenario: User can install all available prebuilt rules at once**](#scenario-user-can-install-all-available-prebuilt-rules-at-once)
    - [**Scenario: Empty screen is shown when all prebuilt rules are installed**](#scenario-empty-screen-is-shown-when-all-prebuilt-rules-are-installed)
    - [**Scenario: User can preview rules available for installation**](#scenario-user-can-preview-rules-available-for-installation)
    - [**Scenario: User can install a rule using the rule preview**](#scenario-user-can-install-a-rule-using-the-rule-preview)
    - [**Scenario: User can see correct rule information in preview before installing**](#scenario-user-can-see-correct-rule-information-in-preview-before-installing)
    - [**Scenario: Optional tabs and sections without content should be hidden in preview before installing**](#scenario-optional-tabs-and-sections-without-content-should-be-hidden-in-preview-before-installing)
  - [Rule installation workflow: filtering, sorting, pagination](#rule-installation-workflow-filtering-sorting-pagination)
    - [**Scenario: User can search prebuilt rules by rule name, index pattern or MITRE ATT\&CK™ tactic or technique on the Prebuilt Rules installation page**](#scenario-user-can-search-prebuilt-rules-by-rule-name-index-pattern-or-mitre-attck-tactic-or-technique-on-the-prebuilt-rules-installation-page)
    - [**Scenario: User can filter prebuilt rules by tags on the Prebuilt Rules installation page**](#scenario-user-can-filter-prebuilt-rules-by-tags-on-the-prebuilt-rules-installation-page)
    - [**Scenario: User can sort prebuilt rules on Prebuilt Rules installation page**](#scenario-user-can-sort-prebuilt-rules-on-prebuilt-rules-installation-page)
    - [**Scenario: User can paginate over prebuilt rules on Prebuilt Rules installation page**](#scenario-user-can-paginate-over-prebuilt-rules-on-prebuilt-rules-installation-page)
  - [Rule installation workflow: misc cases](#rule-installation-workflow-misc-cases)
    - [**Scenario: User opening the Add Rules page sees a loading skeleton until the package installation is completed**](#scenario-user-opening-the-add-rules-page-sees-a-loading-skeleton-until-the-package-installation-is-completed)
    - [**Scenario: User can navigate from the Add Rules page to the Rule Management page via breadcrumbs**](#scenario-user-can-navigate-from-the-add-rules-page-to-the-rule-management-page-via-breadcrumbs)
  - [Rule installation via the Prebuilt rules API](#rule-installation-via-the-prebuilt-rules-api)
    - [**Scenario: API can install all prebuilt rules**](#scenario-api-can-install-all-prebuilt-rules)
    - [**Scenario: API can install prebuilt rules that are not yet installed**](#scenario-api-can-install-prebuilt-rules-that-are-not-yet-installed)
    - [**Scenario: API does not install prebuilt rules if they are up to date**](#scenario-api-does-not-install-prebuilt-rules-if-they-are-up-to-date)
  - [Error handling](#error-handling)
    - [**Scenario: Error is handled when any installation operation on prebuilt rules fails**](#scenario-error-is-handled-when-any-installation-operation-on-prebuilt-rules-fails)
  - [Authorization / RBAC](#authorization--rbac)
    - [**Scenario: User with read privileges on Security Solution cannot install prebuilt rules**](#scenario-user-with-read-privileges-on-security-solution-cannot-install-prebuilt-rules)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 2](https://github.com/elastic/kibana/issues/174167)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).
- **CTA to install prebuilt rules**: a link button with a counter on the Rule Management page.
- **CTA to upgrade prebuilt rules**: a tab with a counter on the Rule Management page.

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

User stories for the main rule installation features:

- User can install single prebuilt rules one-by-one from the Rule Installation page.
- User can install multiple prebuilt rules in bulk from the Rule Installation page.
- User can install all available prebuilt rules in bulk from the Rule Installation page.
- User can preview properties of a prebuilt rule before installing it.

User stories for licensing and RBAC:

- User can install prebuilt rules on the `Basic` license and higher.

Previewing properties of a prebuilt rule before installing it:

- If user chooses to preview a prebuilt rule to be installed, we currently show this preview in a flyout.
- In the prebuilt rule preview a tab that doesn't have any sections should not be displayed and a section that doesn't have any properties also should not be displayed.

## Scenarios

### Rule installation notifications on the Rule Management page

#### **Scenario: User is NOT notified when no prebuilt rules are installed and there are no prebuilt rules assets**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given no prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Prebuilt Rules Upgrades page
```

#### **Scenario: User is NOT notified when all prebuilt rules are installed and up to date**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given the latest prebuilt rule assets exist in Kibana
And all the latest prebuilt rules from those rule assets are installed
When user opens the Rule Management page
Then user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Prebuilt Rules Upgrades page
```

#### **Scenario: User is notified when no prebuilt rules are installed and there are rules available to install**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
And there are X prebuilt rules available to install
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see a number of rules available to install (X)
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Prebuilt Rules Upgrades page
```

#### **Scenario: User is notified when some prebuilt rules can be installed**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given Y prebuilt rule assets exist in Kibana
And X (where X < Y) prebuilt rules are installed
And there are Y more prebuilt rules available to install
And for all X installed rules there are no new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
And user should NOT see the Prebuilt Rules Upgrades page
```

#### **Scenario: User is notified when both rules to install and upgrade are available**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given Y prebuilt rule assets exist in Kibana
And X (where X < Y) prebuilt rules are installed
And Z (where Z < X)  installed rules have matching prebuilt rule assets with higher version available
And for Z of the installed rules there are new versions available
When user opens the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install (Y)
And user should see a CTA to upgrade prebuilt rules
And user should see the number of rules available to upgrade (Z)
```

#### **Scenario: User is notified after a prebuilt rule gets deleted**

**Automation**: 1 e2e test with mock rules + 1 integration test with mock rules for the /status endpoint.

```Gherkin
Given X prebuilt rules are installed in Kibana
And there are no more prebuilt rules available to install
When user opens the Rule Management page
And user deletes Y prebuilt rules
Then user should see a CTA to install prebuilt rules
And user should see <Y> rules available to install
```

### Rule installation workflow: base cases

#### **Scenario: User can install prebuilt rules one by one**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given X prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user installs one individual rule without previewing it
Then success message should be displayed after installation
And the installed rule should be removed from the table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install decreased by 1
```

#### **Scenario: User can install multiple prebuilt rules selected on the page**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given X prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user selects <Y> rules
Then user should see a CTA to install <Y> number of rules
When user clicks the CTA
Then success message should be displayed after installation
And all the installed rules should be removed from the table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install decreased by <Y> number of installed rules

Examples:
  | Y                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User can install all available prebuilt rules at once**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /installation/\* endpoints in integration.

```Gherkin
Given X prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then prebuilt rules available for installation should be displayed in the table
When user installs all rules
Then success message should be displayed after installation
And all the rules should be removed from the table
And user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rule Management page
When user clicks on the CTA
Then user should be navigated back to Rule Management page
And user should NOT see a CTA to install prebuilt rules
And user should NOT see a number of rules available to install
```

#### **Scenario: Empty screen is shown when all prebuilt rules are installed**

**Automation**: 1 e2e test with mock rules + 1 integration test.

```Gherkin
Given all the available prebuilt rules are installed in Kibana
When user opens the Add Rules page
Then user should see a message indicating that all available rules have been installed
And user should see a CTA that leads to the Rule Management page
```

#### **Scenario: User can preview rules available for installation**

**Automation**: 1 e2e test

```Gherkin
Given 2 prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for the 1st rule
Then the preview should open
When user closes the preview
Then it should disappear
```

#### **Scenario: User can install a rule using the rule preview**

**Automation**: 1 e2e test

```Gherkin
Given 2 prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for the rule
Then the preview should open
When user installs the rule using a CTA in the rule preview
Then the rule should be installed
And a success message should be displayed after installation
And the rule should be removed from the Add Rules table
When user navigates back to the Rule Management page
Then user should see a CTA to install prebuilt rules
And user should see the number of rules available to install as initial number minus 1
```

#### **Scenario: User can see correct rule information in preview before installing**

**Automation**: 1 e2e test

```Gherkin
Given X prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then all X rules available for installation should be displayed in the table
When user opens a rule preview for any rule
Then the preview should appear
And all properties of a rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
```

#### **Scenario: Optional tabs and sections without content should be hidden in preview before installing**

**Automation**: 1 e2e test

```Gherkin
Given 1 prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
And this rule has neither Setup guide nor Investigation guide
When user opens the Add Rules page
Then all rules available for installation should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
And the Setup Guide section should NOT be displayed in the Overview tab
And the Investigation Guide tab should NOT be displayed
```

### Rule installation workflow: filtering, sorting, pagination

#### **Scenario: User can search prebuilt rules by rule name, index pattern or MITRE ATT&CK™ tactic or technique on the Prebuilt Rules installation page**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Prebuilt Rules installation page
Then the available prebuilt rules should be shown
When user enters <text> in the search field
Then only the available prebuilt rules matching the <text> should be shown
```

**Examples:**

- `<text>`
  - rule name or its part
  - index pattern
  - MITRE ATT&CK™ tactic or technique

#### **Scenario: User can filter prebuilt rules by tags on the Prebuilt Rules installation page**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Prebuilt Rules installation page
Then the available prebuilt rules should be shown
When user filters the available prebuilt rules by one or more tags
Then only the available prebuilt rules having these tags should be shown
```

#### **Scenario: User can sort prebuilt rules on Prebuilt Rules installation page**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Prebuilt Rules installation page
Then the available prebuilt rules should be shown
When user clicks on <field> header by picking the sorting direction
Then the available prebuilt rules should be sorted by <field> in the expected order
```

**Examples:**

- `<field>`
  - rule name
  - risk score
  - severity

#### **Scenario: User can paginate over prebuilt rules on Prebuilt Rules installation page**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given multiple prebuilt rules available for installation
When user opens the Prebuilt Rules installation page
Then the available prebuilt rules should be shown
When user picks the desired number of <rows_per_page>
Then the <rows_per_page> of the available prebuilt rules should be shown on the page
When user navigates to the next pages
Then the next page of the available prebuilt rules should be shown
```

**Examples:**

`<rows_per_page>` = 5 | 10 | 20 | 50 | 100

### Rule installation workflow: misc cases

#### **Scenario: User opening the Add Rules page sees a loading skeleton until the package installation is completed**

**Automation**: unit tests.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Add Rules page
Then user should see a loading skeleton until the package installation is completed
```

#### **Scenario: User can navigate from the Add Rules page to the Rule Management page via breadcrumbs**

**Automation**: 1 e2e test.

```Gherkin
Given user is on the Add Rules page
When user navigates to the Rule Management page via breadcrumbs
Then the Rule Management page should be displayed
```

### Rule installation via the Prebuilt rules API

There's a legacy prebuilt rules API and a new one. Both should be tested against two types of the package: with and without historical rule versions.

#### **Scenario: API can install all prebuilt rules**

**Automation**: 8 integration tests with mock rules: 4 examples below \* 2 (we split checking API response and installed rules into two different tests).

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
Then the endpoint should return success response (HTTP 200 code) with <install_response>
And N rule objects should be created
And each rule object should have correct id and version

Examples:
  | package_type             | api    | install_response         |
  | with historical versions | legacy | installed: N, updated: 0 |
  | w/o historical versions  | legacy | installed: N, updated: 0 |
  | with historical versions | new    | total: N, succeeded: N   |
  | w/o historical versions  | new    | total: N, succeeded: N   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`

#### **Scenario: API can install prebuilt rules that are not yet installed**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And deletes one of the installed rules
And gets prebuilt rules status via status <api>
Then the endpoint should return successful response (HTTP 200 code) with <status_response>
When user installs all rules via install <api> again
Then the endpoint should return successful response (HTTP 200 code) with <install_response>

Examples:
  | package_type             | api    | status_response  | install_response         |
  | with historical versions | legacy | not_installed: 1 | installed: 1, updated: 0 |
  | w/o historical versions  | legacy | not_installed: 1 | installed: 1, updated: 0 |
  | with historical versions | new    | to_install: 1    | total: 1, succeeded: 1   |
  | w/o historical versions  | new    | to_install: 1    | total: 1, succeeded: 1   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

#### **Scenario: API does not install prebuilt rules if they are up to date**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And user gets prebuilt rules status via status <api>
Then the endpoint should return successful response (HTTP 200 code) with <status_response>
When user calls install <api>
Then the endpoint should return successful response (HTTP 200 code) with <install_response>
When user calls upgrade <api>
Then the endpoint should return successful response (HTTP 200 code) with <upgrade_response>

Examples:
  | package_type             | api    | status_response                  | install_response         | upgrade_response         |
  | with historical versions | legacy | not_installed: 0, not_updated: 0 | installed: 0, updated: 0 | installed: 0, updated: 0 |
  | w/o historical versions  | legacy | not_installed: 0, not_updated: 0 | installed: 0, updated: 0 | installed: 0, updated: 0 |
  | with historical versions | new    | to_install: 0, to_upgrade: 0     | total: 0, succeeded: 0   | total: 0, succeeded: 0   |
  | w/o historical versions  | new    | to_install: 0, to_upgrade: 0     | total: 0, succeeded: 0   | total: 0, succeeded: 0   |
```

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - upgrade: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - upgrade: `POST /internal/detection_engine/prebuilt_rules/upgrade/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

### Error handling

#### **Scenario: Error is handled when any installation operation on prebuilt rules fails**

**Automation**: e2e test with mock rules

```Gherkin
When user is <operation> prebuilt rules
And this operation fails
Then user should see an error message

Examples:
  | operation             |
  | installing all        |
  | installing selected   |
  | installing individual |
```

### Authorization / RBAC

#### **Scenario: User with read privileges on Security Solution cannot install prebuilt rules**

**Automation**: 1 e2e test with mock rules + 3 integration tests with mock rules for the status and installation endpoints.

```Gherkin
Given user with "Security: read" privileges on Security Solution
And prebuilt rule assets exist in Kibana
And no prebuilt rules are installed
When user opens the Add Rules page
Then user should see prebuilt rules available to install
But user should not be able to install them
```
