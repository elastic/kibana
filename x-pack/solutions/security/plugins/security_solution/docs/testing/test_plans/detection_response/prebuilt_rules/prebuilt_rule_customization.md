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
    - [**Scenario: User can navigate to prebuilt rule editing page from the rule details page**](#scenario-user-can-navigate-to-prebuilt-rule-editing-page-from-the-rule-details-page)
    - [**Scenario: User can navigate to prebuilt rule editing page from the rule management page**](#scenario-user-can-navigate-to-prebuilt-rule-editing-page-from-the-rule-management-page)
    - [**Scenario: User can bulk edit prebuilt rules from rules management page**](#scenario-user-can-bulk-edit-prebuilt-rules-from-rules-management-page)
    - [**Scenario: User can customize a prebuilt rule via public API**](#scenario-user-can-customize-a-prebuilt-rule-via-public-api)
  - [Detecting rule customizations](#detecting-rule-customizations)
    - [**Scenario: prebuilt rule's `is_customized` is set to true after it is customized**](#scenario-prebuilt-rules-is_customized-is-set-to-true-after-it-is-customized)
    - [**Scenario: prebuilt rule's `is_customized` value is not affected by specific fields**](#scenario-prebuilt-rules-is_customized-value-is-not-affected-by-specific-fields)
    - [**Scenario: User cannot change non-customizable rule fields on prebuilt rules**](#scenario-user-cannot-change-non-customizable-rule-fields-on-prebuilt-rules)
    - [**Scenario: User can revert a customized prebuilt rule to its original state**](#scenario-user-can-revert-a-customized-prebuilt-rule-to-its-original-state)
  - [Detecting rule customizations when base version is missing](#detecting-rule-customizations-when-base-version-is-missing)
    - [**Scenario: prebuilt rule's `is_customized` is set to true after it is customized when base version is missing**](#scenario-prebuilt-rules-is_customized-is-set-to-true-after-it-is-customized-when-base-version-is-missing)
    - [**Scenario: prebuilt rule's `is_customized` stays unchanged after it is saved unchanged when base version is missing**](#scenario-prebuilt-rules-is_customized-stays-unchanged-after-it-is-saved-unchanged-when-base-version-is-missing)
    - [**Scenario: prebuilt rule's `is_customized` value is not affected by specific fields when base version is missing**](#scenario-prebuilt-rules-is_customized-value-is-not-affected-by-specific-fields-when-base-version-is-missing)
  - [Calculating the Modified badge in the UI](#calculating-the-modified-badge-in-the-ui)
    - [**Scenario: Modified badge should appear on the rule details page when prebuilt rule is customized**](#scenario-modified-badge-should-appear-on-the-rule-details-page-when-prebuilt-rule-is-customized)
    - [**Scenario: Modified badge should not appear on the rule details page when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-details-page-when-prebuilt-rule-isnt-customized)
    - [**Scenario: Modified badge should not appear on a custom rule's rule details page**](#scenario-modified-badge-should-not-appear-on-a-custom-rules-rule-details-page)
    - [**Scenario: Modified badge should appear on the rule management table when prebuilt rule is customized**](#scenario-modified-badge-should-appear-on-the-rule-management-table-when-prebuilt-rule-is-customized)
    - [**Scenario: Modified badge should not appear on the rule management table when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-management-table-when-prebuilt-rule-isnt-customized)
    - [**Scenario: Modified badge should not appear on the rule management table when row is a custom rule**](#scenario-modified-badge-should-not-appear-on-the-rule-management-table-when-row-is-a-custom-rule)
    - [**Scenario: Modified badge should appear on the rule updates table when prebuilt rule is customized**](#scenario-modified-badge-should-appear-on-the-rule-updates-table-when-prebuilt-rule-is-customized)
    - [**Scenario: Modified badge should not appear on the rule updates table when prebuilt rule isn't customized**](#scenario-modified-badge-should-not-appear-on-the-rule-updates-table-when-prebuilt-rule-isnt-customized)
    - [**Scenario: User should be able to filter by customized rules in the rule updates table**](#scenario-user-should-be-able-to-filter-by-customized-rules-in-the-rule-updates-table)
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
- [Relax the rules of handling missing base versions of prebuilt rules](https://github.com/elastic/kibana/issues/210358)
- [Tests for prebuilt rule customization workflow](https://github.com/elastic/kibana/issues/202068)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).
- **Rule source**, or **`ruleSource`**: a rule field that defines the rule's origin. Can be `internal` or `external`. Currently, custom rules have `internal` rule source and prebuilt rules have `external` rule source.
- **`is_customized`**: a field within `ruleSource` that exists when rule source is set to `external`. It is a boolean value based on if the rule has been changed from its base version.
- **non-semantic change**: a change to a rule field that is functionally different. We normalize certain fields so for a time-related field such as `from`, `1m` vs `60s` are treated as the same value. We also trim leading and trailing whitespace for query fields.
- **rule customization**: a change to a customizable field of a prebuilt rule. Full list of customizable rule fields can be found in [Common information about prebuilt rules](./prebuilt_rules_common_info.md#customizable-rule-fields).
- **customizable rule fields**: fields of prebuilt rules that are modifiable by user and are taken into account when calculating `is_customized`. Full list can be found in [Common information about prebuilt rules](./prebuilt_rules_common_info.md#customizable-rule-fields).
- **customizing bulk action**: a bulk action that updates values of customizable fields in multiple rules at once. See list below.

**Examples:**

| `<customizing_bulk_action>` |
| Add index patterns |
| Delete index patterns |
| Add tags |
| Delete tags |
| Add custom highlighted fields |
| Delete custom highlighted fields |
| Update rule schedules |
| Apply timeline template |

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).
- Package with prebuilt rules is already installed, and rule assets from it are stored in Elasticsearch.

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
Given a prebuilt rule installed
And it is non-customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can edit a customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And it is customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can navigate to prebuilt rule editing page from the rule details page**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And the user has navigated to its rule details page
When a user clicks overflow button on this rule
Then the "edit rule settings" button should be enabled
And should bring the user to the rule edit page when clicked on
```

#### **Scenario: User can navigate to prebuilt rule editing page from the rule management page**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And the user has navigated to the rule management page
When a user clicks overflow button on this rule
Then the "edit rule settings" button should be enabled
And should bring the user to the prebuilt rule edit page when clicked on
```

#### **Scenario: User can bulk edit prebuilt rules from rules management page**

**Automation**: a Cypress test for each bulk action type.

```Gherkin
Given prebuilt rules installed
And some of the installed rules are customized
And user selects some customized and non-customized prebuilt rules
When a user applies a <customizing_bulk_action> bulk action to the selected rules
Then the prebuilt rules that have been customized should have a "Modified" badge on the respective row in the rule management table
And the update should be reflected on the corresponding rule details pages
```

#### **Scenario: User can customize a prebuilt rule via public API**

**Automation**: an integration test for each API endpoint.

```Gherkin
Given a prebuilt rule installed
And the user sends a rule customization request to the <API endpoint>
Then the response should contain customized fields
And reading the rule should return the same customized fields
```

**Examples:**

| `<API endpoint>`                                             |
| ------------------------------------------------------------ |
| Update a rule (PUT /api/detection_engine/rules)              |
| Patch a rule (PATCH /api/detection_engine/rules)             |
| Bulk action (POST /api/detection_engine/rules/\_bulk_action) |

### Detecting rule customizations

#### **Scenario: prebuilt rule's `is_customized` is set to true after it is customized**

**Automation**: one integration test per field.

```Gherkin
Given a prebuilt rule installed
When user customizes the prebuilt rule by changing the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should be `true`
And ruleSource should be "external"
```

**Examples:**

`<field_name>` = all customizable rule fields

#### **Scenario: prebuilt rule's `is_customized` value is not affected by specific fields**

**Automation**: 5 integration tests.

```Gherkin
Given a prebuilt rule installed
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should remain `false`
```

**Examples:**

| `<field_name>` |
| actions |
| exceptions_list |
| enabled |
| revision |
| meta |

#### **Scenario: User cannot change non-customizable rule fields on prebuilt rules**

**Automation**: 4 integration tests.

```Gherkin
Given a prebuilt rule installed
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then API should throw a 500 error
And the rule should remain unchanged
```

**Examples:**

`<field_name>` = all non-customizable rule fields

#### **Scenario: User can revert a customized prebuilt rule to its original state**

**Automation**: 3 integration tests (update, patch, bulk edit) and 1 Cypress test.

```Gherkin
Given a prebuilt rule installed
And it is customized
When a user changes the rule fields to match the base version
Then the rule's `is_customized` value should be false
```

### Detecting rule customizations when base version is missing

NOTE: These are not edge cases but rather normal cases. In many package upgrade scenarios, hundreds of prebuilt rules (out of ~1300 of them at the time of writing) won't have a base version.

#### **Scenario: prebuilt rule's `is_customized` is set to true after it is customized when base version is missing**

**Automation**: 1 Cypress test.

```Gherkin
Given a prebuilt rule installed
And the prebuilt rule doesn't have a matching base version
When user customizes the prebuilt rule by changing the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should be `true`
And ruleSource should be "external"
```

**Examples:**

`<field_name>` = all customizable rule fields

#### **Scenario: prebuilt rule's `is_customized` stays unchanged after it is saved unchanged when base version is missing**

**Automation**: 1 Cypress test.

```Gherkin
Given a prebuilt rule installed
And the prebuilt rule doesn't have a matching base version
When user opens the corresponding rule editing page
And saves the form unchanged
Then the rule's `is_customized` value should stay unchanged (non-customized rule stays non-customized)
```

**Examples:**

`<field_name>` = all customizable rule fields

#### **Scenario: prebuilt rule's `is_customized` value is not affected by specific fields when base version is missing**

**Automation**: 5 integration tests.

```Gherkin
Given a prebuilt rule installed
And the prebuilt rule doesn't have a matching base version
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should remain `false`
```

**Examples:**

| `<field_name>` |
| actions |
| exceptions_list |
| enabled |
| revision |
| meta |

### Calculating the Modified badge in the UI

#### **Scenario: Modified badge should appear on the rule details page when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And it is customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be true
And the Modified badge should be present on the page
```

#### **Scenario: Modified badge should not appear on the rule details page when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And it is non-customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be false
And the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should not appear on a custom rule's rule details page**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
When a user navigates to that rule's detail page
Then the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should appear on the rule management table when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And it is customized
When a user navigates to the rule management page
Then the customized rule's `is_customized` value should be true
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And it is non-customized
When a user navigates to the rule management page
Then the non-customized rule's `is_customized` value should be false
And the Modified badge should NOT be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when row is a custom rule**

**Automation**: 1 cypress test.

```Gherkin
Given a custom rule
When a user navigates to the rule management page
Then the Modified badge should NOT be present in the custom rule's table row
```

#### **Scenario: Modified badge should appear on the rule updates table when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule is customized
And that rule has an upgrade
When a user navigates to the rule updates table
And the "Modified" badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule updates table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule is non-customized
And that rules has an upgrade
When a user navigates to the rule updates table
And the "Modified" badge should NOT be present in the table row
```

#### **Scenario: User should be able to filter by customized rules in the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule is customized
When a user navigates to the rule updates page
And applies the filter to display only customized prebuilt rules
Then the table should display only customized prebuilt rules
And all shown table rows should have the "Modified" badge present
```

#### **Scenario: User should be able to filter by non-customized rules on the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a prebuilt rule installed
And that rule is customized
And that rule has an upgrade
When a user navigates to the rule updates page
And applies the filter to display only non-customized prebuilt rules
Then the table should display only non-customized prebuilt rules
And the all shown table rows should NOT have the "Modified" badge present
```

### Licensing

#### **Scenario: User can't customize prebuilt rules under an insufficient license from the rule edit page**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
And a prebuilt rule installed
When user navigates to the prebuilt rule's edit page
Then "About", "Definition" and "Schedule" views should be disabled
When user tries to access the disabled views
Then they should see a message that prebuilt rules editing is not allowed under the current license
And the required license name should be included in the message
```

#### **Scenario: User can't bulk edit prebuilt rules under an insufficient license**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
And a prebuilt rule installed
When a user selects one prebuilt rule in the rule management table
And user's selection doesn't contain any custom rules
And user attempts to apply a <customizing_bulk_action> bulk action to the selected prebuilt rule
Then the user should see a message that this action is not allowed for prebuilt rules under the current license
And the required license name should be included in the message
And no button to proceed with applying the action should be displayed
```

#### **Scenario: User can't bulk edit prebuilt rules in a mixture of prebuilt and custom rules under an insufficient license**

**Automation**: 2 Cypress tests: one for Serverless, one for non-Serverless.

```Gherkin
Given a Kibana instance running under an insufficient license
And a prebuilt rule installed
When a user selects one prebuilt rule in the rule management table
And user also selects one custom rule
And user attempts to apply a <customizing_bulk_action> bulk action to the selected rule
Then the user should see a message that this action is not allowed for prebuilt rules under the current license
And the required license name should be included in the message
And a button to proceed with applying the action only to custom rules should be displayed
```

#### **Scenario: User can't edit prebuilt rules via bulk edit API under an insufficient license**

**Automation**: Multiple API integration tests - Rule update and patch, and one for each bulk action type.

```Gherkin
Given a Kibana instance running under an insufficient license
And a prebuilt rule installed
When a user sends a request to bulk edit API
And the bulk edit action is <customizing_bulk_action>
And this request contains one prebuilt rule
And additionally this request contains one custom rule
Then the response should only list the custom rules as updated
And all prebuilt rules should be listed as not updated
And for each prebuilt rule the response should contain a message that the action is not allowed under current license
```
