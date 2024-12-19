# Upgrade of Prebuilt Rules

This is a test plan for the workflow of upgrading prebuilt rules.

Status: `in progress`. The current test plan matches [Rule Immutability/Customization Milestone 3 epic](https://github.com/elastic/kibana/issues/174168).

## Table of Contents

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
  - [Functional requirements](#functional-requirements)
  - [Scenarios](#scenarios)
      - [Rule installation and upgrade notifications on the Rule Management page](#rule-installation-and-upgrade-notifications-on-the-rule-management-page)
          - [**Scenario: User is NOT notified when all installed prebuilt rules are up to date**](#scenario-user-is-not-notified-when-all-installed-prebuilt-rules-are-up-to-date)
          - [**Scenario: User is notified when some prebuilt rules can be upgraded**](#scenario-user-is-notified-when-some-prebuilt-rules-can-be-upgraded)
          - [**Scenario: User is notified when both rules to install and upgrade are available**](#scenario-user-is-notified-when-both-rules-to-install-and-upgrade-are-available)
      - [Rule upgrade workflow: individual upgrade from Rule Updates table](#rule-upgrade-workflow-individual-and-bulk-updates-from-rule-updates-table)
          - [**Scenario: User can upgrade conflict-free prebuilt rules one by one**](#scenario-user-can-upgrade-conflict-free-prebuilt-rules-one-by-one)
          - [**Scenario: User cannot upgrade prebuilt rules one by one from Rules Update table if they have conflicts**](#scenario-user-cannot-upgrade-prebuilt-rules-one-by-one-from-rules-update-table-if-they-have-conflicts)
      - [Rule upgrade workflow: bulk upgrade from Rule Updates table](#rule-upgrade-workflow-individual-and-bulk-updates-from-rule-updates-table)
          - [**Scenario: User can upgrade multiple conflict-free prebuilt rules selected on the page**](#scenario-user-can-upgrade-multiple-conflict-free-prebuilt-rules-selected-on-the-page)
          - [**Scenario: User cannot upgrade multiple prebuilt rules selected on the page when they have upgrade conflicts**](#scenario-user-cannot-upgrade-multiple-prebuilt-rules-selected-on-the-page-when-they-have-upgrade-conflicts)
          - [**Scenario: User can upgrade all available conflict-free prebuilt rules at once**](#scenario-user-can-upgrade-all-available-conflict-free-prebuilt-rules-at-once)
          - [**Scenario: User cannot upgrade all prebuilt rules at once if they have upgrade conflicts**](#scenario-user-cannot-upgrade-all-prebuilt-rules-at-once-if-they-have-upgrade-conflicts)
          - [**Scenario: User can upgrade only conflict-free rules when a mix of rules with and without conflicts are selected for upgrade in the Rules Table**](#scenario-user-can-upgrade-only-conflict-free-rules-when-a-mix-of-rules-with-and-without-conflicts-are-selected-for-upgrade-in-the-rules-table)
          - [**Scenario: User can upgrade only conflict-free rules when user attempts to upgrade all rules and only a subset contains upgrade conflicts**](#scenario-user-can-upgrade-only-conflict-free-rules-when-user-attempts-to-upgrade-all-rules-and-only-a-subset-contains-upgrade-conflicts)
      - [Rule upgrade workflow: upgrading rules with rule type change](#rule-upgrade-workflow-upgrading-rules-with-rule-type-change)
          - [**Scenario: User can upgrade rule with rule type change individually**](#scenario-user-can-upgrade-rule-with-rule-type-change-individually)
          - [**Scenario: User can bulk upgrade selected rules with rule type changes**](#scenario-user-can-bulk-upgrade-selected-rules-with-rule-type-changes)
          - [**Scenario: User can bulk upgrade all rules with rule type changes**](#scenario-user-can-bulk-upgrade-all-rules-with-rule-type-changes)
      - [Rule upgrade workflow: rule previews](#rule-upgrade-workflow-rule-previews)
          - [**Scenario: User can preview rules available for upgrade**](#scenario-user-can-preview-rules-available-for-upgrade)
          - [**Scenario: User can upgrade a rule using the rule preview**](#scenario-user-can-upgrade-a-rule-using-the-rule-preview)
          - [**Scenario: User can see correct rule information in preview before upgrading**](#scenario-user-can-see-correct-rule-information-in-preview-before-upgrading)
          - [**Scenario: Tabs and sections without content should be hidden in preview before upgrading**](#scenario-tabs-and-sections-without-content-should-be-hidden-in-preview-before-upgrading)
      - [Rule upgrade workflow: filtering, sorting, pagination](#rule-upgrade-workflow-filtering-sorting-pagination)
      - [MILESTONE 2 (Legacy) - Rule upgrade workflow: viewing rule changes in JSON diff view](#milestone-2-legacy---rule-upgrade-workflow-viewing-rule-changes-in-json-diff-view)
          - [**Scenario: User can see changes in a side-by-side JSON diff view**](#scenario-user-can-see-changes-in-a-side-by-side-json-diff-view)
          - [**Scenario: User can see precisely how property values would change after upgrade**](#scenario-user-can-see-precisely-how-property-values-would-change-after-upgrade)
          - [**Scenario: Rule actions and exception lists should not be shown as modified**](#scenario-rule-actions-and-exception-lists-should-not-be-shown-as-modified)
          - [**Scenario: Dynamic properties should not be included in preview**](#scenario-dynamic-properties-should-not-be-included-in-preview)
          - [**Scenario: Technical properties should not be included in preview**](#scenario-technical-properties-should-not-be-included-in-preview)
          - [**Scenario: Properties with semantically equal values should not be shown as modified**](#scenario-properties-with-semantically-equal-values-should-not-be-shown-as-modified)
          - [**Scenario: Unchanged sections of a rule should be hidden by default**](#scenario-unchanged-sections-of-a-rule-should-be-hidden-by-default)
          - [**Scenario: Properties should be sorted alphabetically**](#scenario-properties-should-be-sorted-alphabetically)
      - [MILESTONE 2 (Legacy) - Rule upgrade workflow: viewing rule changes in per-field diff view](#milestone-2-legacy---rule-upgrade-workflow-viewing-rule-changes-in-per-field-diff-view)
          - [**Scenario: User can see changes in a side-by-side per-field diff view**](#scenario-user-can-see-changes-in-a-side-by-side-per-field-diff-view)
          - [**Scenario: User can see changes when updated rule is a different rule type**](#scenario-user-can-see-changes-when-updated-rule-is-a-different-rule-type)
          - [**Scenario: Field groupings should be rendered together in the same accordion panel**](#scenario-field-groupings-should-be-rendered-together-in-the-same-accordion-panel)
          - [**Scenario: Undefined values are displayed with empty diffs**](#scenario-undefined-values-are-displayed-with-empty-diffs)
          - [**Scenario: Field diff components have the same grouping and order as in rule details overview**](#scenario-field-diff-components-have-the-same-grouping-and-order-as-in-rule-details-overview)
      - [Rule upgrade workflow: preserving rule bound data](#rule-upgrade-workflow-preserving-rule-bound-data)
          - [**Scenario: Rule bound data is preserved after upgrading a rule to a newer version with the same rule type**](#scenario-rule-bound-data-is-preserved-after-upgrading-a-rule-to-a-newer-version-with-the-same-rule-type)
          - [**Scenario: Rule bound data is preserved after upgrading a rule to a newer version with a different rule type**](#scenario-rule-bound-data-is-preserved-after-upgrading-a-rule-to-a-newer-version-with-a-different-rule-type)
      - [Rule upgrade workflow: misc cases](#rule-upgrade-workflow-misc-cases)
          - [**Scenario: User doesn't see the Rule Updates tab until the package installation is completed**](#scenario-user-doesnt-see-the-rule-updates-tab-until-the-package-installation-is-completed)
      - [Error handling](#error-handling)
          - [**Scenario: Error is handled when any upgrade operation on prebuilt rules fails**](#scenario-error-is-handled-when-any-upgrade-operation-on-prebuilt-rules-fails)
      - [Rule upgrade via the Prebuilt rules API](#rule-upgrade-via-the-prebuilt-rules-api)
          - [**Scenario: API can upgrade prebuilt rules that are outdated**](#scenario-api-can-upgrade-prebuilt-rules-that-are-outdated)
          - [**Scenario: API does not upgrade prebuilt rules if they are up to date**](#scenario-api-does-not-upgrade-prebuilt-rules-if-they-are-up-to-date)
      - [Authorization / RBAC](#authorization-rbac)
          - [**Scenario: User with read privileges on Security Solution cannot upgrade prebuilt rules**](#scenario-user-with-read-privileges-on-security-solution-cannot-upgrade-prebuilt-rules)


## Useful information

### Tickets

- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic

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

- Notifications, rule installation and rule upgrade workflows should work:
  - regardless of the package type: with historical rule versions or without;
  - regardless of the package registry availability: i.e., they should also work in air-gapped environments.
- Rule installation and upgrade workflows should work with packages containing up to 15000 historical rule versions. This is the max number of versions of all rules in the package. This limit is enforced by Fleet.
- Kibana should not crash with Out Of Memory exception during package installation.
- For test purposes, it should be possible to use detection rules package versions lower than the latest.

### Functional requirements

- User should be able to install prebuilt rules with and without previewing what exactly they would install (rule properties).
- User should be able to upgrade prebuilt rules with and without previewing what updates they would apply (rule properties of target rule versions).
- If user chooses to preview a prebuilt rule to be installed/upgraded, we currently show this preview in a flyout.
- In the prebuilt rule preview a tab that doesn't have any sections should not be displayed and a section that doesn't have any properties also should not be displayed.

Examples of rule properties we show in the prebuilt rule preview flyout:

```Gherkin
Examples:
| rule_type         | property                          | tab                 | section             |
│ All rule types    │ Author                            │ Overview            │ About               │
│ All rule types    │ Building block                    │ Overview            │ About               │
│ All rule types    │ Severity                          │ Overview            │ About               │
│ All rule types    │ Severity override                 │ Overview            │ About               │
│ All rule types    │ Risk score                        │ Overview            │ About               │
│ All rule types    │ Risk score override               │ Overview            │ About               │
│ All rule types    │ Reference URLs                    │ Overview            │ About               │
│ All rule types    │ False positive examples           │ Overview            │ About               │
│ All rule types    │ Custom highlighted fields         │ Overview            │ About               │
│ All rule types    │ License                           │ Overview            │ About               │
│ All rule types    │ Rule name override                │ Overview            │ About               │
│ All rule types    │ MITRE ATT&CK™                     │ Overview            │ About               │
│ All rule types    │ Timestamp override                │ Overview            │ About               │
│ All rule types    │ Tags                              │ Overview            │ About               │
│ All rule types    │ Type                              │ Overview            │ Definition          │
│ All rule types    │ Related integrations              │ Overview            │ Definition          │
│ All rule types    │ Required fields                   │ Overview            │ Definition          │
│ All rule types    │ Timeline template                 │ Overview            │ Definition          │
│ All rule types    │ Runs every                        │ Overview            │ Schedule            │
│ All rule types    │ Additional look-back time         │ Overview            │ Schedule            │
│ All rule types    │ Setup guide                       │ Overview            │ Setup guide         │
│ All rule types    │ Investigation guide               │ Investigation guide │ Investigation guide │
│ Custom Query      │ Index patterns                    │ Overview            │ Definition          │
│ Custom Query      │ Data view ID                      │ Overview            │ Definition          │
│ Custom Query      │ Data view index pattern           │ Overview            │ Definition          │
│ Custom Query      │ Custom query                      │ Overview            │ Definition          │
│ Custom Query      │ Filters                           │ Overview            │ Definition          │
│ Custom Query      │ Saved query name                  │ Overview            │ Definition          │
│ Custom Query      │ Saved query filters               │ Overview            │ Definition          │
│ Custom Query      │ Saved query                       │ Overview            │ Definition          │
│ Custom Query      │ Suppress alerts by                │ Overview            │ Definition          │
│ Custom Query      │ Suppress alerts for               │ Overview            │ Definition          │
│ Custom Query      │ If a suppression field is missing │ Overview            │ Definition          │
│ Machine Learning  │ Anomaly score threshold           │ Overview            │ Definition          │
│ Machine Learning  │ Machine Learning job              │ Overview            │ Definition          │
│ Threshold         │ Threshold                         │ Overview            │ Definition          │
│ Threshold         │ Index patterns                    │ Overview            │ Definition          │
│ Threshold         │ Data view ID                      │ Overview            │ Definition          │
│ Threshold         │ Data view index pattern           │ Overview            │ Definition          │
│ Threshold         │ Custom query                      │ Overview            │ Definition          │
│ Threshold         │ Filters                           │ Overview            │ Definition          │
│ Event Correlation │ EQL query                         │ Overview            │ Definition          │
│ Event Correlation │ Filters                           │ Overview            │ Definition          │
│ Event Correlation │ Index patterns                    │ Overview            │ Definition          │
│ Event Correlation │ Data view ID                      │ Overview            │ Definition          │
│ Event Correlation │ Data view index pattern           │ Overview            │ Definition          │
│ Indicator Match   │ Indicator index patterns          │ Overview            │ Definition          │
│ Indicator Match   │ Indicator mapping                 │ Overview            │ Definition          │
│ Indicator Match   │ Indicator filters                 │ Overview            │ Definition          │
│ Indicator Match   │ Indicator index query             │ Overview            │ Definition          │
│ Indicator Match   │ Index patterns                    │ Overview            │ Definition          │
│ Indicator Match   │ Data view ID                      │ Overview            │ Definition          │
│ Indicator Match   │ Data view index pattern           │ Overview            │ Definition          │
│ Indicator Match   │ Custom query                      │ Overview            │ Definition          │
│ Indicator Match   │ Filters                           │ Overview            │ Definition          │
│ New Terms         │ Fields                            │ Overview            │ Definition          │
│ New Terms         │ History Window Size               │ Overview            │ Definition          │
│ New Terms         │ Index patterns                    │ Overview            │ Definition          │
│ New Terms         │ Data view ID                      │ Overview            │ Definition          │
│ New Terms         │ Data view index pattern           │ Overview            │ Definition          │
│ New Terms         │ Custom query                      │ Overview            │ Definition          │
│ New Terms         │ Filters                           │ Overview            │ Definition          │
│ ESQL              │ ESQL query                        │ Overview            │ Definition          │
│ ESQL              │ Suppress alerts by                │ Overview            │ Definition          │
│ ESQL              │ Suppress alerts for               │ Overview            │ Definition          │
│ ESQL              │ If a suppression field is missing │ Overview            │ Definition          │
```

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

### Rule upgrade workflow: individual updates from Rule Updates table

#### **Scenario: User can upgrade conflict-free prebuilt rules one by one**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
When user is on the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user upgrades one individual rule without previewing it
Then success message should be displayed after upgrade
And the upgraded rule should be removed from the table
And user should see the number of rules available to upgrade decreased by 1
```

#### **Scenario: User cannot upgrade prebuilt rules one by one from Rules Update table if they have conflicts**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And user is on the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
And for Z (where Z < Y) of the rules with upgrades there are upgrade conflicts
Then for those Z rules the Upgrade Rule button should be disabled
And the user should not be able to upgrade them directly from the table
And there should be a message/tooltip indicating why the rule cannot be upgraded directly
```

### Rule upgrade workflow: bulk updates from Rule Updates table

#### **Scenario: User can upgrade multiple conflict-free prebuilt rules selected on the page**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And user opens the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user selects Z (where Z < Y) rules, which have no upgrade conflicts
Then user should see a CTA to upgrade <Z> rules
When user clicks the CTA
Then success message should be displayed after upgrade
And all the <Z> upgraded rules should be removed from the table
And user should see the number of rules available to upgrade decreased by <Z> number of upgraded rules

Examples:
  | Z                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User cannot upgrade selected prebuilt rules with conflicts**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And all of those Y new versions have conflicts with the current versions
And user is on the Rule Management page
When user is on the Rule Updates table
When user selects <Z> rules, all of which have upgrade conflicts
Then user should see a CTA to upgrade <Z> number of rules, which should be disabled
When user hovers on the CTA to upgrade multiple rules
Then a message should be displayed that informs the user why the rules cannot be updated

Examples:
  | Z                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User can upgrade all available conflict-free prebuilt rules at once**

**Automation**: 1 e2e test with mock rules + integration tests with mock rules that would test /status and /upgrade/\* endpoints in integration.

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And those Y new versions don't have conflicts with the current versions
When user is on the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
When user upgrades all rules
Then success message should be displayed after upgrade
And user should NOT see a CTA to upgrade prebuilt rules
And user should NOT see a number of rules available to upgrade
```

#### **Scenario: User cannot upgrade all prebuilt rules at once if they have upgrade conflicts**

**Automation**: 1 e2e test with mock rules 

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And all Y new versions have conflicts with the current versions
When user opens the Rule Updates table  
Then Y rules available for upgrade should be displayed in the table
Then user should see a CTA to upgrade all rules
And the CTA to upgrade all rules should be disabled
When user hovers on the CTA to upgrade all rules
Then a message should be displayed that informs the user why the rules cannot be updated
```

#### **Scenario: User can upgrade only conflict-free rules when a mix of rules with and without conflicts are selected for upgrade**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And a subset Z of the rules have conflicts with the current versions
And user is on the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
And user selects <Z> rules, which is a mixture of rules with and without upgrade conflicts
Then user should see a CTA to upgrade <Z> number of rules, which is enabled
When user clicks the CTA
A modal window should inform the user that only W rules without conflicts will be upgraded
When user confirms the action in the modal
Then success message should be displayed after upgrade informing that W rules were updated
And the W upgraded rules should be removed from the table
And the remaining Z - W rules should still be present in the table
And user should see the number of rules available to upgrade decreased by W number of upgraded rules

Examples:
  | Z                               |
  | a few rules on the page, e.g. 2 |
  | all rules on the page, e.g. 12  |
```

#### **Scenario: User can upgrade only conflict-free rules when attempting to upgrade all rules**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
And Z (where Z < Y) rules have conflicts with the current versions
And user is on the Rule Updates table
Then Y rules available for upgrade should be displayed in the table
Then user should see an enabled CTA to upgrade all rules
When user clicks the CTA
A modal window should inform the user that only K (where K < Y) rules without conflicts will be upgraded
When user confirms the action in the modal
Then success message should be displayed after upgrade informing that K rules were updated
And the K upgraded rules should be removed from the table
And the remaining M = Y - K rules should still be present in the table
And user should see the number of rules available to upgrade decreased by K number of upgraded rules
```


### Rule upgrade workflow: upgrading rules with rule type change

#### **Scenario: User can upgrade rule with rule type change individually**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available that changes its rule type
When user opens the Rule Updates table
Then this rule should be displayed in the table
And the Upgrade Rule button should be disabled
And the user should not be able to upgrade them directly from the table
And there should be a message/tooltip indicating why the rule cannot be upgraded directly
```

#### **Scenario: User can bulk upgrade selected rules with rule type changes**


**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And Y of these rules have updates available that change their rule types
When user opens the Rule Updates table
Then Y rules should be displayed in the table
When user selects Z rules (where Z < Y) with rule type changes
The button to upgrade the Z selected rules should be disabled
And the user should not be able to upgrade them directly from the table
And there should be a message/tooltip indicating why the rule cannot be upgraded directly
```

#### **Scenario: User can bulk upgrade all rules with rule type changes**

**Automation**: 1 e2e test with mock rules

```Gherkin
Given X prebuilt rules are installed in Kibana
And all X rules have updates available that change their rule types
When user opens the Rule Updates table
Then X rules should be displayed in the table
The button to upgrade all rules with should be disabled
And the user should not be able to upgrade them directly from the table
And there should be a message/tooltip indicating why the rule cannot be upgraded directly
```

### Rule upgrade workflow: rule previews

#### **Scenario: User can preview rules available for upgrade**

```Gherkin
Given there is at least one prebuilt rule installed in Kibana
And for this rule there is a new version available
And user is on the Rule Management page
When user opens the Rule Updates table
Then this rule should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
When user closes the preview
Then it should disappear
```

#### **Scenario: User can upgrade a rule using the rule preview**

**Automation**: 1 e2e test

```Gherkin
Given there is at least one prebuilt rule installed in Kibana
And for this rule there is a new version available
And user is on the Rule Management page
When user opens the Rule Updates table
Then this rule should be displayed in the table
When user opens the rule preview for this rule
Then the preview should open
When user upgrades the rule using a CTA in the rule preview
Then the rule should be upgraded to the latest version
And a success message should be displayed after upgrade
And the rule should be removed from the Rule Updates table
And user should see the number of rules available to upgrade as initial number minus 1
```

#### **Scenario: User can see correct rule information in preview before upgrading**

**Automation**: 1 e2e test

```Gherkin
Given X prebuilt rules of all types are installed in Kibana
And for all of the installed rules there are new versions available
And user is on the Rule Management page
When user opens the Rule Updates table
Then all X rules available for upgrade should be displayed in the table
When user opens a rule preview for any rule
Then the preview should appear
And the "Updates" tab should be active
When user selects the "Overview" tab
Then all properties of the new version of a rule should be displayed in the correct tab and section of the preview (see examples of rule properties above)
```

#### **Scenario: Tabs and sections without content should be hidden in preview before upgrading**

**Automation**: 1 e2e test

```Gherkin
Given at least 1 prebuilt rule is installed in Kibana
And for this rule there is a new version available
And the updated version of a rule has neither Setup guide nor Investigation guide
And user is on the Rule Management page
When user opens the Rule Updates table
Then all rules available for upgrade should be displayed in the table
When user opens the rule preview for a rule without Setup guide and Investigation guide
Then the preview should open
And the Setup Guide section should NOT be displayed in the Overview tab
And the Investigation Guide tab should NOT be displayed
```

### Rule upgrade workflow: filtering, sorting, pagination

TODO: add scenarios https://github.com/elastic/kibana/issues/166215

### MILESTONE 2 (Legacy) - Rule upgrade workflow: viewing rule changes in JSON diff view

> These flow were created for Milestone 2 of the Prebuilt Rules Customization epic, before users could customize prebuilt rules. This section should be deleted once Milestone 3 goes live.

#### **Scenario: User can see changes in a side-by-side JSON diff view**

**Automation**: 1 e2e test

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of these rules new versions are available
When user opens the Rule Updates table and selects a rule
Then the upgrade preview should open
And rule changes should be displayed in a two-column JSON diff view
And correct rule version numbers should be displayed in their respective columns
When the user selects another rule without closing the preview
Then the preview should display the changes for the newly selected rule
```

#### **Scenario: User can see precisely how property values would change after upgrade**

**Automation**: 1 UI integration test

```Gherkin
Given a rule preview with rule changes is open
Then each line of <column> that was <change_type> should have <bg_color> background
And marked with <line_badge> badge
And each changed word in <column> should be highlighted with <accent_color>

Examples:
| change_type | column         | bg_color         | accent_color         | line_badge |
| updated     | Current rule   | removed_bg_color | removed_accent_color | -          |
| updated     | Elastic update | added_bg_color   | added_accent_color   | +          |
| removed     | Current rule   | removed_bg_color | none                 | -          |
| removed     | Elastic update | none             | none                 | none       |
| added       | Current rule   | none             | none                 | none       |
| added       | Elastic update | added_bg_color   | none                 | +          |
```

#### **Scenario: Rule actions and exception lists should not be shown as modified**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And the currently installed version of this rule doesn't have any actions or an exception list
And a user has set up actions and an exception list for this rule
And this rule has an update available
And the update doesn't define any actions or an exception list
When a user opens the upgrade preview for this rule
Then the preview should open
And the JSON diff shouldn't show any modifications to rule's actions or exception list
```

#### **Scenario: Dynamic properties should not be included in preview**

**Automation**: 1 e2e test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule is disabled by default
And a user has enabled this rule
And this rule executed at least once
And this rule has an update available
When user opens the upgrade preview
Then the preview should open
And the JSON diff shouldn't show any <property> properties on both sides

Examples:
| property          |
| execution_summary |
| enabled           |
```

#### **Scenario: Technical properties should not be included in preview**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
When a user opens the upgrade preview
Then the preview should open
And the JSON diff shouldn't show any <technical_property> properties on both sides

Examples:
| technical_property |
| revision           |
| updated_at         |
| updated_by         |
| created_at         |
| created_by         |
```

#### **Scenario: Properties with semantically equal values should not be shown as modified**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
And the update has properties with different, but semantically equal values
When a user opens the upgrade preview
Then the preview should open
And the JSON diff shouldn't show any changes to properties with semantically equal values

Duration examples:
| 1h       |
| 60m      |
| 3600s    |

Empty value examples:
| no value  |
| ''        |
| []        |
| undefined |
| null      |
```

#### **Scenario: Unchanged sections of a rule should be hidden by default**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
When a user opens the upgrade preview
Then the preview should open
And only the sections of the diff that have changes should be visible
And unchanged sections should be hidden behind a button with a number of unchanged lines
When a user clicks on the hidden section button
Then the section should expand and show the unchanged properties
```

#### **Scenario: Properties should be sorted alphabetically**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
When a user opens the upgrade preview
Then the preview should open
And visible properties should be sorted alphabetically
When a user expands all hidden sections
Then all properties of the rule should be sorted alphabetically
```

### MILESTONE 2 (Legacy) - Rule upgrade workflow: viewing rule changes in per-field diff view

> These flow were created for Milestone 2 of the Prebuilt Rules Customization epic, before users could customize prebuilt rules. This section should be deleted once Milestone 3 goes live.

#### **Scenario: User can see changes in a side-by-side per-field diff view**

**Automation**: 1 e2e test

```Gherkin
Given X prebuilt rules are installed in Kibana
And for Y of these rules new versions are available
When user opens the Rule Updates table and selects a rule
Then the per-field upgrade preview should open
And rule changes should be displayed in a two-column diff view with each field in its own accordion component
And all field diff accordions should be open by default
And correct rule version numbers should be displayed in their respective columns
When the user selects another rule without closing the preview
Then the preview should display the changes for the newly selected rule
```

#### **Scenario: User can see changes when updated rule is a different rule type**

**Automation**: 1 e2e test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available that changes the rule type
When user opens the upgrade preview
Then the rule type changes should be displayed in grouped field diffs with corresponding query fields
# When tooltip enhancement is added, this step needs to be added to the corresponding test scenario
And a tooltip is displayed with information about changing rule types
```

#### **Scenario: Field groupings should be rendered together in the same accordion panel**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule contains one or more <field> values
When user opens the upgrade preview
The <field> diff accordion panel should display its grouped rule properties
And each property should have its name displayed inside the panel above its value

Examples:
| field              |
| data_source        |
| kql_query          |
| eql_query          |
| esql_query         |
| threat_query       |
| rule_schedule      |
| rule_name_override |
| timestamp_override |
| timeline_template  |
| building_block     |
| threshold          |
```

#### **Scenario: Undefined values are displayed with empty diffs**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has field in the <version_one> version that didn't exist in the <version_two> version
When a user opens the upgrade preview
Then the preview should open
And the old/new field should render an empty panel

Examples:
| version_one | version_two |
| target      | current     |
| current     | target      |
```

#### **Scenario: Field diff components have the same grouping and order as in rule details overview**

**Automation**: 1 UI integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has multiple fields that are different between the current and target version
When a user opens the upgrade preview
Then the multiple field diff accordions should be sorted in the same order as on the rule details overview tab
And the field diff accordions should be grouped inside its corresponding <section> accordion
And any <section> accordion that doesn't have fields inside it shouldn't be displayed

Examples:
| section     |
| About       |
| Definition  |
| Schedule    |
| Setup Guide |
```

### Rule upgrade workflow: preserving rule bound data

#### **Scenario: Rule bound data is preserved after upgrading a rule to a newer version with the same rule type**

**Automation**: 1 unit test per case, 1 integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
And the update has the same rule type
When a user upgrades the rule
Then the rule bound data should be preserved
```

Examples: generated alerts, exception lists (rule exception list, shared exception list, endpoint exception list), timeline reference, actions, enabled state, execution results and execution events.

#### **Scenario: Rule bound data is preserved after upgrading a rule to a newer version with a different rule type**

**Automation**: 1 unit test per case, 1 integration test

```Gherkin
Given a prebuilt rule is installed in Kibana
And this rule has an update available
And the update has a different rule type
When a user upgrades the rule
Then the rule bound data should be preserved
```

Examples: generated alerts, exception lists (rule exception list, shared exception list, endpoint exception list), timeline reference, actions, enabled state, execution results and execution events.

### Rule upgrade workflow: misc cases

#### **Scenario: User doesn't see the Rule Updates tab until the package installation is completed**

**Automation**: unit tests.

```Gherkin
Given prebuilt rules package is not installed
When user opens the Rule Management page
Then user should NOT see the Rule Updates tab until the package installation is completed and there are rules available for upgrade
```

### Error handling

#### **Scenario: Error is handled when any upgrade operation on prebuilt rules fails**

**Automation**: e2e test with mock rules

```Gherkin
When user is <operation> prebuilt rules
And this operation fails
Then user should see an error message

Examples:
  | operation             |
  | upgrading all         |
  | upgrading selected    |
  | upgrading individual  |
```


### Rule upgrade via the Prebuilt rules API

There's a legacy prebuilt rules API and a new one. Both should be tested against two types of the package: with and without historical rule versions.

#### **Scenario: API can upgrade prebuilt rules that are outdated**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And new X+1 version of a rule asset <assets_update>
And user gets prebuilt rules status via status <api>
Then the endpoint should return 200 with <status_response>
When user upgrades all rules via upgrade <api>
Then the endpoint should return 200 with <upgrade_response>

Examples:
  | package_type             | api    | assets_update | status_response | upgrade_response         |
  | with historical versions | legacy | gets added    | not_updated: 1  | installed: 0, updated: 1 |
  | w/o historical versions  | legacy | replaces X    | not_updated: 1  | installed: 0, updated: 1 |
  | with historical versions | new    | gets added    | to_upgrade: 1   | total: 1, succeeded: 1   |
  | w/o historical versions  | new    | replaces X    | to_upgrade: 1   | total: 1, succeeded: 1   |
```

TODO: Check why for the legacy API Dmitrii has added 2 integration tests for `rule package with historical versions` instead of 1:

- `should update outdated prebuilt rules when previous historical versions available`
- `should update outdated prebuilt rules when previous historical versions unavailable`

(NOTE: the second scenario tests that, if a new version of a rule is released, it can upgrade the current instance of that rule even if the historical versions of that rule are no longer in the package)

Notes:

- Legacy API:
  - install: `PUT /api/detection_engine/rules/prepackaged`
  - upgrade: `PUT /api/detection_engine/rules/prepackaged`
  - status: `GET /api/detection_engine/rules/prepackaged/_status`
- New API:
  - install: `POST /internal/detection_engine/prebuilt_rules/installation/_perform`
  - upgrade: `POST /internal/detection_engine/prebuilt_rules/upgrade/_perform`
  - status: `GET /internal/detection_engine/prebuilt_rules/status`

#### **Scenario: API does not upgrade prebuilt rules if they are up to date**

**Automation**: 4 integration tests with mock rules.

```Gherkin
Given the package <package_type> is installed
And the package contains N rules
When user installs all rules via install <api>
And user gets prebuilt rules status via status <api>
Then the endpoint should return 200 with <status_response>
When user calls install <api>
Then the endpoint should return 200 with <install_response>
When user calls upgrade <api>
Then the endpoint should return 200 with <upgrade_response>

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

### Authorization / RBAC

#### **Scenario: User with read privileges on Security Solution cannot upgrade prebuilt rules**

**Automation**: 1 e2e test with mock rules + 3 integration tests with mock rules for the status and upgrade endpoints.

```Gherkin
Given user with "Security: read" privileges on Security Solution
And X prebuilt rules are installed in Kibana
And for Y of the installed rules there are new versions available
When user opens the Rule Management page
And user opens the Rule Updates table
Then user should see prebuilt rules available to upgrade
But user should not be able to upgrade them
```