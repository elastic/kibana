# Test plan: upgrading prebuilt rules one-by-one with preview <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

## Summary <!-- omit from toc -->

This is a test plan for the workflow of:

- upgrading single prebuilt rules one-by-one

from the Rule Upgrade table with previewing incoming updates from Elastic and user customizations in the Rule Upgrade flyout.

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Functional requirements](#functional-requirements)
- [Scenarios](#scenarios)
  - [Rule upgrade field preview](#rule-upgrade-field-preview)
    - [Preview non-customized field that has an upgrade (AAB)](#preview-non-customized-field-that-has-an-upgrade-aab)
    - [Preview customized field that doesn't have an upgrade (ABA)](#preview-customized-field-that-doesnt-have-an-upgrade-aba)
    - [Preview customized field that has a matching upgrade (ABB)](#preview-customized-field-that-has-a-matching-upgrade-abb)
    - [Preview customized field that has an upgrade resulting in a solvable conflict (ABC, conflict solvable by diff algo)](#preview-customized-field-that-has-an-upgrade-resulting-in-a-solvable-conflict-abc-conflict-solvable-by-diff-algo)
    - [Preview customized field that has an upgrade resulting in a non-solvable conflict (ABC, conflict non-solvable by diff algo)](#preview-customized-field-that-has-an-upgrade-resulting-in-a-non-solvable-conflict-abc-conflict-non-solvable-by-diff-algo)
  - [Rule upgrade field preview Diff View options](#rule-upgrade-field-preview-diff-view-options)
    - [Preview customized field that doesn't have an upgrade (AAB diff case)](#preview-customized-field-that-doesnt-have-an-upgrade-aab-diff-case)
    - [Preview non-customized field that has an upgrade (ABA diff case)](#preview-non-customized-field-that-has-an-upgrade-aba-diff-case)
    - [Preview customized field diff that has a matching upgrade (ABB diff case)](#preview-customized-field-diff-that-has-a-matching-upgrade-abb-diff-case)
    - [Preview customized field diff that has an upgrade with a solvable conflict (ABC diff case, conflict solvable by diff algo)](#preview-customized-field-diff-that-has-an-upgrade-with-a-solvable-conflict-abc-diff-case-conflict-solvable-by-diff-algo)
    - [Preview customized field diff that has an upgrade with a non-solvable conflict (ABC diff case, conflict non-solvable by diff algo)](#preview-customized-field-diff-that-has-an-upgrade-with-a-non-solvable-conflict-abc-diff-case-conflict-non-solvable-by-diff-algo)
  - [Field editing](#field-editing)
    - [Validation blocks saving field form when value is invalid](#validation-blocks-saving-field-form-when-value-is-invalid)
    - [Saving unchanged field form value doesn't add up or remove anything to the field diff in Diff View](#saving-unchanged-field-form-value-doesnt-add-up-or-remove-anything-to-the-field-diff-in-diff-view)
  - [Rule upgrade button](#rule-upgrade-button)
    - [Rule upgrade button is disabled when num of conflicts \>= 1](#rule-upgrade-button-is-disabled-when-num-of-conflicts--1)
    - [Rule upgrade button is disabled when num fields in edit mode \>= 1](#rule-upgrade-button-is-disabled-when-num-fields-in-edit-mode--1)
    - [Rule upgrade button is disabled when num of conflicts \>= 1 or num fields in edit mode \>= 1](#rule-upgrade-button-is-disabled-when-num-of-conflicts--1-or-num-fields-in-edit-mode--1)
  - [Rule upgrade after field preview](#rule-upgrade-after-field-preview)
    - [Non-customized rule upgrade after preview (AAB diff case)](#non-customized-rule-upgrade-after-preview-aab-diff-case)
    - [Non-customized rule upgrade after preview and customizing field values (AAB diff case)](#non-customized-rule-upgrade-after-preview-and-customizing-field-values-aab-diff-case)
    - [Customized rule upgrade after preview customized fields that don't have upgrades (ABA diff case)](#customized-rule-upgrade-after-preview-customized-fields-that-dont-have-upgrades-aba-diff-case)
    - [Customized rule upgrade after preview customized fields that don't have upgrades and changing that field values (ABA diff case)](#customized-rule-upgrade-after-preview-customized-fields-that-dont-have-upgrades-and-changing-that-field-values-aba-diff-case)
    - [Customized rule upgrade after preview and accepting solvable conflicts (ABC diff case, conflict solvable by diff algo)](#customized-rule-upgrade-after-preview-and-accepting-solvable-conflicts-abc-diff-case-conflict-solvable-by-diff-algo)
    - [Customized rule upgrade after preview and accepting edited solvable conflicts (ABC diff case, conflict solvable by diff algo)](#customized-rule-upgrade-after-preview-and-accepting-edited-solvable-conflicts-abc-diff-case-conflict-solvable-by-diff-algo)
    - [Customized rule upgrade after preview non-solvable conflicts and accepting suggested field value (ABC diff case, non-solvable by diff algo)](#customized-rule-upgrade-after-preview-non-solvable-conflicts-and-accepting-suggested-field-value-abc-diff-case-non-solvable-by-diff-algo)
    - [Customized rule upgrade after preview non-solvable conflicts and accepting edited field value (ABC diff case, non-solvable by diff algo)](#customized-rule-upgrade-after-preview-non-solvable-conflicts-and-accepting-edited-field-value-abc-diff-case-non-solvable-by-diff-algo)
  - [Rule type upgrade](#rule-type-upgrade)
    - [Non-customized rule upgrade to a different rule type after preview](#non-customized-rule-upgrade-to-a-different-rule-type-after-preview)
    - [Customized rule upgrade to a different rule type after preview](#customized-rule-upgrade-to-a-different-rule-type-after-preview)
  - [Concurrency control](#concurrency-control)
    - [User gets notified after someone edited a rule being previewed](#user-gets-notified-after-someone-edited-a-rule-being-previewed)
    - [User gets notified after a new rule versions is released](#user-gets-notified-after-a-new-rule-versions-is-released)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Tests for prebuilt rule upgrade workflow](https://github.com/elastic/kibana/issues/202078)

### Terminology

- **CTA**: "call to action", usually a button, a link, or a callout message with a button, etc, that invites the user to do some action.

  - **CTA to upgrade the prebuilt rule**: the button to upgrade the prebuilt rule currently shown in the Rule Upgrade flyout.

- **Non-customized field**: a prebuilt rule's field that has the original value from the originally installed prebuilt rule.

- **Customized field**: a prebuilt rule's field that has a value that differs from the original field value of the originally installed prebuilt rule.

- **Non-customized rule**: a prebuilt rule that doesn't have any customized fields.

- **Customized rule**: a prebuilt rule that has one or more customized fields.

### Assumptions

- Below scenarios only apply to prebuilt detection rules.
- A prebuilt rule is shown in the Rule Upgrade table when there's a newer version of this rule in the currently installed package with prebuilt rules.

### Functional requirements

- User should be able to upgrade prebuilt rules one-by-one with the ability to preview:
  - what updates they would receive from Elastic in the latest rule version;
  - what user customizations they would retain in the rule;
  - are there any conflicts between the updates from Elastic and the user customizations;
  - what they should pay attention to in case there are any conflicts.
- A preview should be shown in the Rule Upgrade flyout.
- The Rule Upgrade flyout should contain a few tabs:
  - The "Updates" tab.
  - The "Overview" tab.
  - The "Investigation guide" tab.
- On the "Updates" tab:
  - We should show the updates from Elastic and the user-customized fields.
  - We should show only those fields that are [customizable](./shared_assets/customizable_rule_fields.md).
  - We shouldn't show technical fields and those that are [not customizable](./shared_assets/non_customizable_rule_fields.md).
- User should be able to upgrade a prebuilt rule that has some updates to [non-customizable fields](./shared_assets/non_customizable_rule_fields.md) in the latest version.
- Any other fields that are not involved in the rule upgrade workflow, such as `enabled` or `exceptions`, should stay unchanged after rule upgrade.

## Scenarios

### Rule upgrade field preview

#### Preview non-customized field that has an upgrade (AAB)

**Automation**: Jest functional test for each \<field\>.

```Gherkin
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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

### Field editing

#### Validation blocks saving field form when value is invalid

**Automation**: 1 Jest integration test per \<field\> + \<diff case\> variation.

```Gherkin
Given an installed prebuilt rule
And <field> corresponds to a <diff case>
And <field> appears in the Rule Update Flyout
When user edits <field>'s in a <field> form
And enters an invalid value
Then Save button should be disabled
And user should not be able to save the <field> form until a valid value is entered

Examples:
<field> = all customizable fields

<diff case>
 - AAB = a customized field that has doesn't have an upgrade
 - ABA = a non-customized field that has an upgrade
 - ABB = a customized field diff that has a matching upgrade
 - ABC solvable = customized field diff that has an upgrade with a solvable conflict
 - ABC non-solvable = customized field diff that has an upgrade with a non-solvable conflict
```

#### Saving unchanged field form value doesn't add up or remove anything to the field diff in Diff View

**Automation**: 1 Jest integration test per \<field\> + \<diff case\> variation.

```Gherkin
Given an installed prebuilt rule
And <field> corresponds to a <diff case>
And <field> appears in the Rule Update Flyout
When user opens a <field> form
And saves the form without changes
Then <field> Diff View should not have any new lines added up or removed

Examples:
<field> = all customizable fields

<diff case>
 - AAB = a customized field that has doesn't have an upgrade
 - ABA = a non-customized field that has an upgrade
 - ABB = a customized field diff that has a matching upgrade
 - ABC solvable = customized field diff that has an upgrade with a solvable conflict
 - ABC non-solvable = customized field diff that has an upgrade with a non-solvable conflict
```

### Rule upgrade button

#### Rule upgrade button is disabled when num of conflicts >= 1

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
And that rule has customizations
And it has an upgrade resulting to conflicts
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
When user hover on the INACTIVE CTA
Then explanation tooltip appears
When user resolves all conflicts
Then the INACTIVE CTA becomes ACTIVE
```

#### Rule upgrade button is disabled when num fields in edit mode >= 1

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
And it has an upgrade without conflicts
When user opens the Rule Update Flyout
Then user should see ACTIVE CTA to upgrade the prebuilt rule
When user switch one or more fields to edit mode
Then user should see INACTIVE CTA
When user hover on the INACTIVE CTA
Then explanation tooltip appears
When user every field in readonly mode
Then the INACTIVE CTA becomes ACTIVE
```

#### Rule upgrade button is disabled when num of conflicts >= 1 or num fields in edit mode >= 1

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
And that rule has customizations
And it has an upgrade resulting to conflicts
When user opens the Rule Update Flyout
Then user should see INACTIVE CTA to upgrade the prebuilt rule
When user resolves all conflicts
Then the INACTIVE CTA becomes ACTIVE
When user switches one or more fields to edit mode
Then user should see INACTIVE CTA
```

### Rule upgrade after field preview

#### Non-customized rule upgrade after preview (AAB diff case)

**Automation**: Jest integration test per \<field\> and 1 bulk Cypress test.

```Gherkin
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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

### Rule type upgrade

#### Non-customized rule upgrade to a different rule type after preview

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
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
Given an installed prebuilt rule
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

### Concurrency control

#### User gets notified after someone edited a rule being previewed

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
And that rule has an upgrade
And <userA> opened Rule Update Preview
And saved custom field values via field forms
When <userB> edits the same rule providing changed field values
Then <userA> should see a notification that rule has been edited
And saved custom field values got discarded
```

#### User gets notified after a new rule versions is released

**Automation**: 1 Cypress test.

```Gherkin
Given an installed prebuilt rule
And that rule has an upgrade
And user opened Rule Update Preview
And saved custom field values via field forms
When a new version of the same rule gets available
Then user should see a notification that a new rule version was detected
And saved custom field values got discarded
```
