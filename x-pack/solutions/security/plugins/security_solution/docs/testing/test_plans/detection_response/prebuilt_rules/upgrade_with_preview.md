# Upgrading prebuilt rules one-by-one with preview

This is an upgrading prebuilt rules after preview workflow test plan.

Status: `in progress`. The current test plan matches [Rule Immutability/Customization Milestone 3 epic](https://github.com/elastic/kibana/issues/174168).

## Table of Contents

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
  - [Functional requirements](#functional-requirements)
  - [Scenarios](#scenarios)
    - [Rule upgrade field preview](#rule-upgrade-field-preview)
    - [Rule upgrade field preview Diff View options](#rule-upgrade-field-preview-diff-view-options)
    - [Rule upgrade after field preview](#rule-upgrade-after-field-preview)
    - [Misc](#misc)

## Useful information

### Tickets

- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic (internal)

**Milestone 3 - Prebuilt Rules Customization:**

- [Milestone 3 epic ticket](https://github.com/elastic/kibana/issues/174168)
- [Tests for prebuilt rule upgrade workflow #202078](https://github.com/elastic/kibana/issues/202078)

### Terminology

- **CTA**: "call to action", usually a button, a link, or a callout message with a button, etc, that invites the user to do some action.

  - **CTA to upgrade the prebuilt rule** - a button to upgrade the current prebuilt rule shown in a flyout

- **field is non-customized**: rule's field has an original value obtained after prebuilt rule installation

- **field is customized**: rule's field has a value semantically different from ann original one obtained after prebuilt rule installation

- **rule is installed**: rule has been installed and doesn't have any customized fields

- **rule is non-customized**: rule doesn't have any customized fields

- **rule is customized**: rule has one or more customized fields

### Assumptions

- Below scenarios only apply to prebuilt detection rules.
- A rule is shown on Rule Upgrade page when it has an upgrade.

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
- Rule preview shows only customizable fields listed below

```Gherkin
Examples:
│ Rule type         │ Field name in UI                  │ Diffable rule field     │
-----------------------------------------------------------------------------------
│ All rule types    │ Rule name                         │ name                    │
│ All rule types    │ Rule description                  │ description             │
│ All rule types    │ Tags                              │ tags                    │
│ All rule types    │ Default severity                  │ severity                │
│ All rule types    │ Severity Override                 │ severity_mapping        │
│ All rule types    │ Default risk score                │ risk_score              │
│ All rule types    │ Risk score override               │ risk_score_mapping      │
│ All rule types    │ Reference URLs                    │ references              │
│ All rule types    │ False positive examples           │ false_positives         │
│ All rule types    │ MITRE ATT&CK™ threats             │ threat                  │
│ All rule types    │ Setup guide                       │ note                    │
│ All rule types    │ Investigation guide               │ setup                   │
│ All rule types    │ Related integrations              │ related_integrations    │
│ All rule types    │ Required fields                   │ required_fields         │
│ All rule types    │ Rule schedule                     │ rule_schedule           │
│ All rule types    │ Max alerts per run                │ max_signals             │
│ All rule types    │ Rule name override                │ rule_name_override      │
│ All rule types    │ Timestamp override                │ timestamp_override      │
│ All rule types    │ Timeline template                 │ timeline_template       │
│ All rule types    │ Building block                    │ building_block          │
│ All rule types    │ (mark alerts as building block)   │ building_block          │
│ All rule types    │ Required fields                   │ investigation_fields    │
│ All rule types    │ Data source*                      │ data_source             │
│ All rule types    │ Suppress alerts                   │ alert_suppression       │
│ Custom Query      │ Custom query                      │ kql_query               │
│ Saved Query       │ Custom query                      │ kql_query               │
│ EQL               │ EQL query                         │ eql_query               │
│ ESQL              │ ESQL query                        │ esql_query              │
│ Threat Match      │ Custom query                      │ kql_query               │
│ Threat Match      │ Indicator index patterns          │ threat_index            │
│ Threat Match      │ Indicator index query             │ threat_query            │
│ Threat Match      │ Indicator mapping                 │ threat_mapping          │
│ Threat Match      │ Indicator prefix override         │ threat_indicator_path   │
│ Threshold         │ Custom query                      │ kql_query               │
│ Threshold         │ Threshold config                  │ threshold               │
│ Machine Learning  │ Machine Learning job              │ machine_learning_job_id │
│ Machine Learning  │ Anomaly score threshold           │ anomaly_threshold       │
│ New Terms         │ Custom query                      │ kql_query               │
│ New Terms         │ Fields                            │ new_terms_fields        │
│ New Terms         │ History Window Size               │ history_window_start    │

* Data Source represents index patterns or a data view. Machine Learning rules don't have data_source field.
```

## Scenarios

### Rule upgrade field preview

#### Preview non-customized field that has an upgrade (AAB)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given a prebuilt rule installed
And that rule has no customizations
And <field> has an upgrade
When user opens the Rule Update Flyout
Then user should see <field> has no conflicts
And <field> is shown collapsed
When user expands <field>
Then user should see <field> Diff View
And user should see <field> Readonly View

Examples:
<field> = all customizable fields
```

#### Preview customized field that doesn't have an upgrade (ABA)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has no upgrades
When user opens the Rule Update Flyout
Then user should see <field> has a customized value
And <field> has no conflicts
And <field> is shown collapsed
When user expands <field>
Then user should see <field> Diff View
And user should see <field> Readonly View

Examples:
<field> = all customizable fields
```

#### Preview customized field that has a matching upgrade (ABB)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has an upgrade matching customization
When user opens the Rule Update Flyout
Then user should see <field> has matching upgrade
And <field> has no conflicts
And <field> is shown collapsed
When user expands <field>
Then user should see <field> Diff View
And user should see <field> Readonly View

Examples:
<field> = all customizable fields
```

#### Preview customized field that has an upgrade resulting in a solvable conflict (ABC, conflict solvable by diff algo)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has an upgrade resulting in a solvable conflict
When user opens the Rule Update Flyout
Then user should see <field> has a customized value
And <field> has a conflict
And <field> is shown expanded
And <field> Diff View is shown
And <field> Readonly View is shown
And <field> Readonly View displays a merged value
When user switches to edit form
Then user should see <field> edit form
And <field> edit form has merged value

Examples: <field> whose diff algo supports values merging
| data_source       |
| tags              |
| description       |
| references        |
| note              |
| setup             |
| threat_index      |
| new_terms_fields  |
```

#### Preview customized field that has an upgrade resulting in a non-solvable conflict (ABC, conflict non-solvable by diff algo)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has an upgrade resulting in a non-solvable conflict
When user opens the Rule Update Flyout
Then user should see <field> has a customized value
And <field> has a conflict
And <field> is shown expanded
And <field> Diff View is shown
And <field> edit form is shown
And <field> edit form displays current rule version field value
When user saves and accepts the form
Then user should see <field> Readonly mode
And <field> Readonly mode displays the current rule version field value

Examples:
<field> = all customizable fields, but always mergeable fields "tags", "references", "threat_index", "new_terms_fields"
```

### Rule upgrade field preview Diff View options

#### Preview customized field that doesn't have an upgrade (AAB diff case)

**Automation**: 1 Jest integration test.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> doesn't have an upgrade
When user opens the Rule Update Flyout
Then user should see <field> Diff View
And it shows a diff between original and current <field> values
When user edits and saves the <field> form
Then user should see a diff between original and edited <field> values

Examples:
<field> = all customizable fields
```

#### Preview non-customized field that has an upgrade (ABA diff case)

**Automation**: 1 Jest integration test.

```Gherkin
Given a prebuilt rule installed
And <field> isn't customized
And <field> has an upgrade
When user opens the Rule Update Flyout
Then user should see <field> Diff View
And it shows a diff between original and upgraded <field> values
When user edits and saves the <field> form
Then user should see a diff between original and edited <field> values
And user should have an ability to see <diff option>

Examples:
<field> = all customizable fields

<diff option>
 - Elastic update, a diff between original and upgrade field values
```

#### Preview customized field diff that has a matching upgrade (ABB diff case)

**Automation**: 1 Jest integration test.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has a matching upgrade
When user opens the Rule Update Flyout
Then user should see <field> Diff View
And it shows a diff between original and customized <field> values
And user should have an ability to see a <diff option>
When user edits and saves the <field> form
Then user should see a diff between original and edited <field> values
And user should have an ability to see a <diff option>

Examples:
<field> = all customizable fields

<diff option>
 - Elastic update, a diff between original and upgrade field values
```

#### Preview customized field diff that has an upgrade with a solvable conflict (ABC diff case, conflict solvable by diff algo)

**Automation**: 1 Jest integration test.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has an upgrade resulting in a solvable conflict
When user opens the Rule Update Flyout
Then user should see <field> Diff View
And it shows a diff between original and merged (customization + upgrade) <field> values
And user should have an ability to see a <diff option>
When user edits and saves the <field> form
Then user should see a diff between original and edited <field> values
And user should have an ability to see a <diff option>

Examples:
<field> = all customizable fields

<diff option>
 - Elastic update, a diff between original and upgrade field values
 - Original field customization, a diff between original and customized field values
```

#### Preview customized field diff that has an upgrade with a non-solvable conflict (ABC diff case, conflict non-solvable by diff algo)

**Automation**: 1 Jest integration test.

```Gherkin
Given a prebuilt rule installed
And <field> is customized
And <field> has an upgrade resulting in a non-solvable conflict
When user opens the Rule Update Flyout
Then user should see <field> Diff View
And it shows a diff between original and customized <field> values
And user should have an ability to see a <diff option A>
When user edits and saves the <field> form
Then user should see a diff between original and edited <field> values
And user should have an ability to see a <diff option B>

Examples:
<field> = all customizable fields

<diff option A>
 - Elastic upgrade, a diff between original and upgrade field values

<diff option B>
 - Elastic upgrade, a diff between original and upgrade field values
 - Original customization, a diff between original and customized field values
```

### Rule upgrade after field preview

#### Non-customized rule upgrade after preview (AAB diff case)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule does not have any customizations
And <field> has an upgrade
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And user should see <field> has no conflicts
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has an upgraded value

Examples:
<field> = all customizable fields
```

#### Non-customized rule upgrade after preview and customizing field values (AAB diff case)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule does not have any customizations
And <field> has an upgrade
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And user should see <field> has no conflicts
When user edits <field> form to something different but valid and saves the form
Then user should see <field> has a new value
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has a new value

Examples:
<field> = all customizable fields
```

#### Customized rule upgrade after preview customized fields that don't have upgrades (ABA diff case)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <field> customized
And it has an upgrade for <fieldB> (<fieldB> != <fieldA>)
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And user should see <fieldA> has a customized value and there are no conflicts
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <fieldA> has preserved the customized value

Examples:
<field> = all customizable fields
```

#### Customized rule upgrade after preview customized fields that don't have upgrades and changing that field values (ABA diff case)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <fieldA> customized
And it has an upgrade for <fieldB> (<fieldB> != <fieldA>)
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And user should see <fieldA> has a customized value and there are no conflicts
When user edits <fieldA> form to something different but valid and saves the form
Then user should see <fieldA> has a new value
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <fieldA> has a new value

Examples:
<field> = all customizable fields
```

#### Customized rule upgrade after preview and accepting solvable conflicts (ABC diff case, conflict solvable by diff algo)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <field> customized
And it has an upgrade resulting in a solvable conflict
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
And user should see <field> has a conflict
When user accepts the suggested merged upgrade value for <field>
Then user should see an ACTIVE CTA to upgrade the prebuilt rule
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has an upgraded value user accepted

Examples: <field> is one of
| data_source       |
| tags              |
| description       |
| references        |
| note              |
| setup             |
| threat_index      |
| new_terms_fields  |
```

#### Customized rule upgrade after preview and accepting edited solvable conflicts (ABC diff case, conflict solvable by diff algo)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <field> customized
And it has an upgrade resulting in a solvable conflict
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
And user should see <field> has a conflict
And <field> readonly view with merged value is shown
When user switches <field> to "edit mode"
Then user should see <field> edit form
And <field> edit form has a merged value
When user edits the suggested upgrade value and saves the form
Then user should see an ACTIVE CTA to upgrade the prebuilt rule
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has an upgraded value user entered and saved in the form

Examples: <field> is one of
| data_source       |
| tags              |
| description       |
| references        |
| note              |
| setup             |
| threat_index      |
| new_terms_fields  |
```

#### Customized rule upgrade after preview non-solvable conflicts and accepting suggested field value (ABC diff case, non-solvable by diff algo)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <field> customized
And it has an upgrade resulting to a non-solvable conflict
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
And <field> has a conflict
And <field> edit form is shown
And <field> edit form inputs have current customized value
When user saves the form without changes
Then user should see an ACTIVE CTA to upgrade the prebuilt rule
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has an upgraded value accepted by user

Examples:
<field> = all customizable fields
```

#### Customized rule upgrade after preview non-solvable conflicts and accepting edited field value (ABC diff case, non-solvable by diff algo)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has <field> customized
And it has an upgrade resulting to a non-solvable conflict
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
And <field> has a conflict
And <field> edit form is shown
And <field> edit form inputs have current customized value
When user edits <field> form and saves it
Then user should see an ACTIVE CTA to upgrade the prebuilt rule
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has an upgraded value user entered and saved in the form

Examples:
<field> = all customizable fields, but always mergeable fields "tags", "references", "threat_index", "new_terms_fields"
```

### Misc

#### Non-customized rule upgrade to a different rule type after preview

**Automation**: 1 Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has no customizations
And it has an upgrade
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And a warning message saying rule upgrade changes its type
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has changed its type
And has upgraded field values
```

#### Customized rule upgrade to a different rule type after preview

**Automation**: 1 Cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule has customizations
And it has an upgrade
When user opens the Rule Update Flyout
Then user should see a CTA to upgrade the prebuilt rule
And a warning message saying rule upgrade changes its type
And user is gonna lose all customizations
When user clicks on CTA
Then success message should be displayed after upgrade
And upgraded prebuilt rule should be removed from the table
When user opens rule details page for that prebuilt rule
Then user should see <field> has changed its type
And has upgraded field values
```
