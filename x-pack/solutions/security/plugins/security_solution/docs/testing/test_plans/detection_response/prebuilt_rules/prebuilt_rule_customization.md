# Test plan: customizing prebuilt rules <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, get started [here](./prebuilt_rules.md) and check an overview of the features of prebuilt rules in [this section](./prebuilt_rules_common_info.md#features).

## Summary <!-- omit from toc -->

This is a test plan for the workflows of customizing prebuilt rules via:

- editing single rules one-by-one on the Rule Editing page:
  - initiated from the Rule Details page
  - initiated from the Rule Management page
- editing multiple rules in bulk on the Rule Management page via bulk actions, such as:
  - bulk adding or removing index patterns
  - bulk updating rule schedule

as well as un-customizing prebuilt rules by reverting rule parameters back to their original values.

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
  - [Editing prebuilt rules](#editing-prebuilt-rules)
    - [**Scenario: User can edit a non-customized prebuilt rule from the rule edit page**](#scenario-user-can-edit-a-non-customized-prebuilt-rule-from-the-rule-edit-page)
    - [**Scenario: User can edit a customized prebuilt rule from the rule edit page**](#scenario-user-can-edit-a-customized-prebuilt-rule-from-the-rule-edit-page)
    - [**Scenario: User can navigate to rule editing page from the rule details page**](#scenario-user-can-navigate-to-rule-editing-page-from-the-rule-details-page)
    - [**Scenario: User can navigate to rule editing page from the rule management page**](#scenario-user-can-navigate-to-rule-editing-page-from-the-rule-management-page)
    - [**Scenario: User can bulk edit prebuilt rules from rules management page**](#scenario-user-can-bulk-edit-prebuilt-rules-from-rules-management-page)
  - [Detecting rule customizations](#detecting-rule-customizations)
    - [**Scenario: is\_customized is set to true when user edits a customizable rule field**](#scenario-is_customized-is-set-to-true-when-user-edits-a-customizable-rule-field)
    - [**Scenario: is\_customized calculation is not affected by specific fields**](#scenario-is_customized-calculation-is-not-affected-by-specific-fields)
    - [**Scenario: User cannot change non-customizable rule fields on prebuilt rules**](#scenario-user-cannot-change-non-customizable-rule-fields-on-prebuilt-rules)
    - [**Scenario: User can revert a customized prebuilt rule to its original state**](#scenario-user-can-revert-a-customized-prebuilt-rule-to-its-original-state)
  - [Calculating the Modified badge in the UI](#calculating-the-modified-badge-in-the-ui)
    - [**Scenario: Modified badge should appear on the rule details page when prebuilt rule is customized**](#scenario-modified-badge-should-appear-on-the-rule-details-page-when-prebuilt-rule-is-customized)
    - [**Scenario: Modified badge should not appear on the rule details page when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-details-page-when-prebuilt-rule-isnt-customized)
    - [**Scenario: Modified badge should not appear on a custom rule's rule details page**](#scenario-modified-badge-should-not-appear-on-a-custom-rules-rule-details-page)
    - [**Scenario: Modified badge should appear on the rule management table when prebuilt rule is modified**](#scenario-modified-badge-should-appear-on-the-rule-management-table-when-prebuilt-rule-is-modified)
    - [**Scenario: Modified badge should not appear on the rule management table when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-management-table-when-prebuilt-rule-isnt-customized)
    - [**Scenario: Modified badge should not appear on the rule management table when row is a custom rule**](#scenario-modified-badge-should-not-appear-on-the-rule-management-table-when-row-is-a-custom-rule)
    - [**Scenario: Modified badge should appear on the rule updates table when prebuilt rule is customized**](#scenario-modified-badge-should-appear-on-the-rule-updates-table-when-prebuilt-rule-is-customized)
    - [**Scenario: Modified badge should not appear on the rule updates table when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-updates-table-when-prebuilt-rule-isnt-customized)
    - [**Scenario: User should be able to see only customized rules in the rule updates table**](#scenario-user-should-be-able-to-see-only-customized-rules-in-the-rule-updates-table)
    - [**Scenario: User should be able to filter by non-customized rules on the rule updates table**](#scenario-user-should-be-able-to-filter-by-non-customized-rules-on-the-rule-updates-table)
  - [Licensing](#licensing)
    - [**Scenario: User can't customize prebuilt rules under an insufficient license from the rule edit page**](#scenario-user-cant-customize-prebuilt-rules-under-an-insufficient-license-from-the-rule-edit-page)
    - [**Scenario: User can't bulk edit prebuilt rules under an insufficient license**](#scenario-user-cant-bulk-edit-prebuilt-rules-under-an-insufficient-license)
    - [**Scenario: User can't bulk edit prebuilt rules in a mixture of prebuilt and custom rules under an insufficient license**](#scenario-user-cant-bulk-edit-prebuilt-rules-in-a-mixture-of-prebuilt-and-custom-rules-under-an-insufficient-license)
    - [**Scenario: User can't edit prebuilt rules via bulk edit API under an insufficient license**](#scenario-user-cant-edit-prebuilt-rules-via-bulk-edit-api-under-an-insufficient-license)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Tests for prebuilt rule customization workflow](https://github.com/elastic/kibana/issues/202068)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).
- **Rule source**, or **`ruleSource`**: a rule field that defines the rule's origin. Can be `internal` or `external`. Currently, custom rules have `internal` rule source and prebuilt rules have `external` rule source.
- **`is_customized`**: a field within `ruleSource` that exists when rule source is set to `external`. It is a boolean value based on if the rule has been changed from its base version.
- **non-semantic change**: a change to a rule field that is functionally different. We normalize certain fields so for a time-related field such as `from`, `1m` vs `60s` are treated as the same value. We also trim leading and trailing whitespace for query fields.
- **rule customization**: a change to a customizable field of a prebuilt rule. Full list of customizable rule fields can be found in [Common information about prebuilt rules](./prebuilt_rules_common_info.md#customizable-rule-fields).
- **customizable rule fields**: fields of prebuilt rules that are modifiable by user and are taken into account when calculating `is_customized`. Full list can be found in [Common information about prebuilt rules](./prebuilt_rules_common_info.md#customizable-rule-fields).
- **customizing bulk action**: a bulk action that updates values of customizable fields in multiple rules at once. See list below.
```Gherkin
Examples:
| customizing_bulk_action          |
| Add index patterns               |
| Delete index patterns            |
| Add tags                         |
| Delete tags                      |
| Add custom highlighted fields    |
| Delete custom highlighted fields |
| Update rule schedules            |
| Apply timeline template          |
```

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).
- Rule package used will have all previous rule versions present (no missing base versions).

### Technical requirements

Non-functional requirements for the functionality outlined in this test plan.

- [Common technical requirements](./prebuilt_rules_common_info.md#common-technical-requirements).

### Product requirements

Functional requirements for the functionality outlined in this test plan.

- [Common product requirements](./prebuilt_rules_common_info.md#common-product-requirements).

User stories:

- User can edit a single prebuilt rule from the Rule Details page.
- User can edit single prebuilt rules one-by-one from the Rule Management page.
- User can edit multiple prebuilt rules in bulk via bulk actions on the Rule Management page. For example:
  - User can bulk add index patterns to prebuilt rules.
  - User can bulk update rule schedule in prebuilt rules.
- User can customize most of the fields of prebuilt rules:
  - User can edit and customize almost any field of a prebuilt rule, just like it's possible to do with custom rules, via editing it directly or via bulk editing via bulk actions.
  - User can't edit the Author and License fields.
- User can see if the rule is customized on the Rule Details page.
- User can see which rules are customized on the Rule Management page in the Upgrade table.
- User can un-customize a prebuilt rule by editing it and reverting its parameters back to their original values.

## Scenarios

### Editing prebuilt rules

#### **Scenario: User can edit a non-customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And the rule is non-customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can edit a customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And it is customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can navigate to rule editing page from the rule details page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And the user has navigated to its rule details page
When a user clicks overflow button on this rule
Then the "edit rule settings" button should be enabled
And should bring the user to the rule edit page when clicked on
```

#### **Scenario: User can navigate to rule editing page from the rule management page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And the user has navigated to the rule management page
When a user clicks overflow button on this rule
Then the "edit rule settings" button should be enabled
And should bring the user to the rule edit page when clicked on
```

#### **Scenario: User can bulk edit prebuilt rules from rules management page**

**Automation**: a Cypress test for each bulk action type.

```Gherkin
Given a space with N (where N > 1) prebuilt rules installed
And a user selects M (where M <= N) in the rules table
When a user applies a <customizing_bulk_action> bulk action
And the action is successfully applied to M selected rules
Then rules that have been changed from their base version should have a "Modified" badge on the respective row in the rule management table
And the update should be reflected on the rule details page
```

### Detecting rule customizations

#### **Scenario: is_customized is set to true when user edits a customizable rule field**

**Automation**: one integration test per field.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should be true
And ruleSource should be "external"

Examples:
<field_name> = all customizable rule fields
```

#### **Scenario: is_customized calculation is not affected by specific fields**

**Automation**: 5 integration tests.

```Gherkin
Given a space with at least one prebuilt rule installed
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should remain false

Examples:
| field_name      |
| actions         |
| exceptions_list |
| enabled         |
| revision        |
| meta            |
```

#### **Scenario: User cannot change non-customizable rule fields on prebuilt rules**

**Automation**: 4 integration tests.

```Gherkin
Given a space with at least one prebuilt rule installed
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then API should throw a 500 error
And the rule should remain unchanged

Examples:
<field_name> = all non-customizable rule fields
```

#### **Scenario: User can revert a customized prebuilt rule to its original state**

**Automation**: 1 integration test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user changes the rule fields to match the base version
Then the rule's `is_customized` value should be false
```

### Calculating the Modified badge in the UI

#### **Scenario: Modified badge should appear on the rule details page when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be true
And the Modified badge should be present on the page
```

#### **Scenario: Modified badge should not appear on the rule details page when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is non-customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be false
And the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should not appear on a custom rule's rule details page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one custom rule
When a user navigates to that rule's detail page
Then the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should appear on the rule management table when prebuilt rule is modified**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user navigates to the rule management page
Then the customized rule's `is_customized` value should be true
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is non-customized
When a user navigates to the rule management page
Then the non-customized rule's `is_customized` value should be false
And the Modified badge should NOT be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when row is a custom rule**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one custom rule
When a user navigates to the rule management page
Then the Modified badge should NOT be present in the custom rule's table row
```

#### **Scenario: Modified badge should appear on the rule updates table when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates table
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule updates table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one non-customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates table
And the Modified badge should NOT be present in the table row
```

#### **Scenario: User should be able to see only customized rules in the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates page
And use filter to show customized rules
Then the table should display only customized rules
And all shown table rows should have the Modified badge present
```

#### **Scenario: User should be able to filter by non-customized rules on the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates page
And use filter to show non-customized rules
Then the table should display only non-customized rules
And the all shown table rows should NOT have the Modified badge present
```

### Licensing

#### **Scenario: User can't customize prebuilt rules under an insufficient license from the rule edit page**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
When user navigates to the rule edit page of a prebuilt rule
Then About, Definition and Schedule views should be disabled
When user tries to access the disabled views
Then they should see a message that editing is not allowed under the current license
And required license name should be included in the message
```

#### **Scenario: User can't bulk edit prebuilt rules under an insufficient license**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
When a user selects one or more prebuilt rules in the rule management table
And user's selection doesn't contain any custom rules
And user attempts to apply a <customizing_bulk_action> bulk action to selected rules
Then the user should see a message that this action is not allowed for prebuilt rules under the current license
And required license name should be included in the message
And no button to proceed with applying the action should be displayed
```

#### **Scenario: User can't bulk edit prebuilt rules in a mixture of prebuilt and custom rules under an insufficient license**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
When a user selects one or more prebuilt rules in the rule management table
And user also selects one or more custom rules
And user attempts to apply a <customizing_bulk_action> bulk action to selected rules
Then the user should see a message that this action is not allowed for prebuilt rules under the current license
And required license name should be included in the message
And a button to proceed with applying the action only to custom rules should not be displayed
```

#### **Scenario: User can't edit prebuilt rules via bulk edit API under an insufficient license**

**Automation**: Multiple API integration tests - one for each bulk action type.

```Gherkin
Given a Kibana instance running under an insufficient license
When a user sends a request to bulk edit API
And request's "dry run" parameter is set to false
And the bulk edit action is <customizing_bulk_action>
And this request contains one or more prebuilt rules
And additionally this request contains one or more custom rules
Then the response should only list the custom rules as updated
And all prebuilt rules should be listed as not updated
And for each prebuilt rule the response should contain a message that the action is not allowed under current license
```