# Prebuilt Rule Customization Workflows

This is a test plan for rule customization workflows specifically related to prebuilt rules

Status: `in progress`.

## Useful information

### Tickets

- [Test plan issue](https://github.com/elastic/kibana/issues/202068)
- [Prebuilt rule customization](https://github.com/elastic/kibana/issues/174168) epic

### Terminology

- **Base version**: The version of the rule we ship with the rule package, can be thought of as the "original" version of the rule.

- **Customized prebuilt rule**: A prebuilt rule that has been changed by the user from the base version of the rule. Also referred to as "Modified" in the UI.

- **Non-customized prebuilt rule**: A prebuilt rule that has no change from the base version of the rule.

- **Custom rules**: A rule created by the user themselves

### Assumptions

- Rule package used will have all rule versions present (no missing base versions)

## Scenarios

### Editing prebuilt rules

#### **Scenario: User can edit a non-customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And the rule is unmodified
When a user edits the rule from the rule edit page to something different than the original version
Then the rule is successfully updated
And the ruleSource should be "external"
And isCustomized should be true
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can edit a customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user edits the rule from the rule edit page to something different than the original version
Then the rule is successfully updated
And the ruleSource should be "external"
And isCustomized should be true
And the "Modified" badge should still appear on the rule's detail page
```

#### **Scenario: User can edit a single prebuilt rule from the rule management page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
When a user clicks overflow button on this rule
Then the "edit rule settings" button should be enabled
And should bring the user to the rule edit page when clicked on
```

#### **Scenario: User can bulk edit prebuilt rules from rules management page**

**Automation**: 8 cypress tests and 8 integration tests.

```Gherkin
Given a space with at multiple prebuilt rule installed
And a user selects multiple rules in the rules table
When a user applies a <bulk_action_type> bulk action
And the action is successfully applied to selected rules
Then rules that have been changed from their base version should have a ruleSource of "external"
And isCustomized should be true
And the "Modified" badge should appear on the respective row in the rule management table

Examples:
| bulk_action_type                 |
| Add index patterns               |
| Delete index patterns            |
| Add tags                         |
| Delete tags                      |
| Add custom highlighted fields    |
| Delete custom highlighted fields |
| Modify rule schedules            |
| Add rule actions                 |
```

### Calculating is_customized value

#### **Scenario: is_customized is set to true when user edits a customizable rule field**

**Automation**: 44 integration tests.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user edits the <field_name> field to something different than the base version
Then the rule's isCustomized value should be true
And ruleSource should be "external"

Examples:
| field_name              |
| name                    |
| description             |
| interval                |
| from                    |
| to                      |
| note                    |
| severity                |
| tags                    |
| severity_mapping        |
| risk_score              |
| risk_score_mapping      |
| references              |
| false_positives         |
| threat                  |
| note                    |
| setup                   |
| related_integrations    |
| required_fields         |
| max_signals             |
| investigation_fields    |
| rule_name_override      |
| timestamp_override      |
| timeline_template       |
| building_block_type     |
| query                   |
| language                |
| filters                 |
| index                   |
| data_view_id            |
| alert_suppression       |
| event_category_override |
| timestamp_field         |
| tiebreaker_field        |
| threat_index            |
| threat_mapping          |
| threat_indicator_path   |
| threat_query            |
| threat_language         |
| threat_filters          |
| threshold               |
| machine_learning_job_id |
| anomaly_threshold       |
| new_terms_fields        |
| history_window_start    |
| type                    |
```

#### **Scenario: is_customized is not set to true when user edits rule fields that aren't used in customized calculation**

**Automation**: 4 integration tests.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user edits the <field_name> field to something different than the base version
Then the rule's isCustomized value should remain false
And ruleSource should be "external"

Examples:
| field_name      |
| actions         |
| exceptions_list |
| enabled         |
| revision        |
```

#### **Scenario: User can revert a customized prebuilt rule to its original state**

**Automation**: 1 integration test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user edits the rule back to the same rule object as the base version
Then the rule's isCustomized value should be false
And ruleSource should be "external"
```

### Calculating the is_customized field and the Modified badge in the UI

#### **Scenario: Modified badge should appear on the rule details page when rule is modified**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user navigates to that rule's detail page
Then the rule's isCustomized value should be true
And ruleSource should be "external"
And the Modified badge should be present on the page
```

#### **Scenario: Modified badge should not appear on the rule details page when rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user navigates to that rule's detail page
Then the rule's isCustomized value should be false
And ruleSource should be "external"
And the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should appear on the rule management table when rule is modified**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user navigates to that rule management page
Then the customized rule's isCustomized value should be true
And ruleSource should be "external"
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user navigates to the rule management page
Then the non-customized rule's isCustomized value should be false
And ruleSource should be "external"
And the Modified badge should NOT be present in the table row
```

#### **Scenario: Modified badge should appear on the rule updates table when rule is modified**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user navigates to that rule updates page
Then the customized rule's isCustomized value should be true
And ruleSource should be "external"
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule updates table when rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user navigates to the rule updates page
Then the non-customized rule's isCustomized value should be false
And ruleSource should be "external"
And the Modified badge should NOT be present in the table row
```

#### **Scenario: User should be able to filter by modified rules on the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user navigates to the rule updates page
And sorts by Modified in the filter drop-down
Then the table should only display modified rules
And the table rows should have the Modified badge present
```

#### **Scenario: User should be able to filter by unmodified rules on the rule updates table**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule installed
When a user navigates to the rule updates page
And sorts by Unmodified in the filter drop-down
Then the table should only display unmodified rules
And the table rows should NOT have the Modified badge present
```
