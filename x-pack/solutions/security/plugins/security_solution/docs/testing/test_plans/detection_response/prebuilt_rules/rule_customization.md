# Prebuilt Rule Customization Workflows

This is a test plan for rule customization workflows specifically related to prebuilt rules

Status: `in progress`.

## Useful information

### Tickets

- [Test plan issue](https://github.com/elastic/kibana/issues/202068)
- [Prebuilt rule customization](https://github.com/elastic/kibana/issues/174168) epic

### Terminology

- **Base version**: Prebuilt rule asset we ship in the rule package corresponding to the currently installed prebuilt rules. It represents "original" version of the rule. During prebuilt rules installation prebuilt rule assets data is copied over and becomes an installed prebuilt rule.

- **Customized prebuilt rule**: An installed prebuilt rule that has been changed by the user in the way rule fields semantically differ from the base version. Also referred to as "Modified" in the UI.

- **Non-customized prebuilt rule**: An installed prebuilt rule that has rule fields values matching the base version.

- **Custom rule**: A rule created by the user themselves

- **rule source, or ruleSource**: A field on the rule that defines the rule's categorization. Can be `internal` or `external`.

- **`is_customized`**: A field within `ruleSource` that exists when rule source is set to `external`. It is a boolean value based on if the rule has been changed from its base version

- **customizable rule field**: A rule field that is able to be customized on a prebuilt rule. This includes nearly every field on our rule object aside from `author` and `license`.

- **non-semantic change**: A change to a rule field that is functionally different. We normalize certain fields so for a time-related field such as `from`, `1m` vs `60s` are treated as the same value. We also trim leading and trailing whitespace for query fields.

### Assumptions

- Rule package used will have all previous rule versions present (no missing base versions)

## Scenarios

### Editing prebuilt rules

#### **Scenario: User can edit a non-customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And the rule is non-customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the ruleSource should be "external"
And `is_customized` should be true
And the "Modified" badge should appear on the rule's detail page
```

#### **Scenario: User can edit a customized prebuilt rule from the rule edit page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule installed
And it is customized
When user changes any rule field value (so it differs from the base version) in rule edit form
Then the rule is successfully updated
And the ruleSource should be "external"
And `is_customized` should be true
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

**Automation**: 8 cypress tests and 8 integration tests.

```Gherkin
Given a space with N (where N > 1) prebuilt rules installed
And a user selects M (where M <= N) in the rules table
When a user applies a <bulk_action_type> bulk action
And the action is successfully applied to M selected rules
Then rules that have been changed from their base version should have a ruleSource of "external"
And `is_customized` should be true
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

**Automation**: one integration test per field.

```Gherkin
Given a space with at least one non-customized prebuilt rule installed
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should be true
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

#### **Scenario: is_customized calculation is not affected by specific fields**

**Automation**: 4 integration tests.

```Gherkin
Given a space with at least one prebuilt rule installed
And it is non-customized
When a user changes the <field_name> field so it differs from the base version
Then the rule's `is_customized` value should remain false
And ruleSource should be "external"

Examples:
| field_name      |
| actions         |
| exceptions_list |
| enabled         |
| revision        |
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
| field_name |
| version    |
| id         |
| author     |
| license    |
```

#### **Scenario: User can revert a customized prebuilt rule to its original state**

**Automation**: 1 integration test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user changes the rule fields to match the base version
Then the rule's `is_customized` value should be false
And ruleSource should be "external"
```

### Calculating the is_customized field and the Modified badge in the UI

#### **Scenario: Modified badge should appear on the rule details page when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be true
And ruleSource should be "external"
And the Modified badge should be present on the page
```

#### **Scenario: Modified badge should not appear on the rule details page when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is non-customized
When a user navigates to that rule's detail page
Then the rule's `is_customized` value should be false
And ruleSource should be "external"
And the Modified badge should NOT be present on the page
```

#### **Scenario: Modified badge should not appear on a custom rule's rule details page**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one custom rule
When a user navigates to that rule's detail page
Then the Modified badge should NOT be present on the page
And ruleSource should be "internal"
```

#### **Scenario: Modified badge should appear on the rule management table when prebuilt rule is modified**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is customized
When a user navigates to the rule management page
Then the customized rule's `is_customized` value should be true
And ruleSource should be "external"
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one prebuilt rule
And it is non-customized
When a user navigates to the rule management page
Then the non-customized rule's `is_customized` value should be false
And ruleSource should be "external"
And the Modified badge should NOT be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule management table when row is a custom rule**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one custom rule
When a user navigates to the rule management page
Then the Modified badge should NOT be present in the custom rule's table row
And its ruleSource should be "external"
```

#### **Scenario: Modified badge should appear on the rule updates table when prebuilt rule is customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates table
Then the customized rule's `is_customized` value should be true
And ruleSource should be "external"
And the Modified badge should be present in the table row
```

#### **Scenario: Modified badge should not appear on the rule updates table when prebuilt rule isn't customized**

**Automation**: 1 cypress test.

```Gherkin
Given a space with at least one non-customized prebuilt rule
And that rules have upgrades
When a user navigates to the rule updates table
Then the non-customized rule's `is_customized` value should be false
And ruleSource should be "external"
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
