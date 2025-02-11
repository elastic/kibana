# Detection Rule Export

This is a test plan for the exporting of prebuilt and custom rules. This feature is an aspect of `Milestone 3` of the [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic.

Status: `in progress`.

## Useful information

### Tickets

- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974)
- [Rule Exporting Feature](https://github.com/elastic/kibana/issues/180167#issue-2227974379)
- [Rule Export API PR](https://github.com/elastic/kibana/pull/194498)

### Terminology

- **prebuilt rule**: A rule contained in our `Prebuilt Security Detection Rules` integration in Fleet.
- **custom rule**: A rule defined by the user, which has no relation to the prebuilt rules
- **rule source, or ruleSource**: A field on the rule that defines the rule's categorization

## Scenarios

### Core Functionality

#### Scenario: Exporting prebuilt rule individually from rule details page

**Automation**: 2 cypress tests.

```Gherkin
Given a space with a <rule_type> rule installed
When the user selects "Export rule" from the "All actions" dropdown on the rule's detail page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of true
And its "ruleSource" "type" should be "external"
And its "ruleSource" "isCustomized" value should be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rule individually from rule details page

**Automation**: 1 cypress test.

```Gherkin
Given a space with a custom rule installed
When the user selects "Export rule" from the "All actions" dropdown on the rule's detail page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of false
And its "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting prebuilt rule individually from rules management table

**Automation**: 2 cypress tests.

```Gherkin
Given a space with a <rule_type> rule installed
When the user selects "Export rule" from the rule's overflow dropdown on the rules management page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of true
And its "ruleSource" "type" should be "external"
And its "ruleSource" "isCustomized" value should be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rule individually from rules management table

**Automation**: 1 cypress test.

```Gherkin
Given a space with a custom rule installed
When the user selects "Export rule" from the rule's overflow dropdown on the rules management page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of false
And its "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting prebuilt rules in bulk

**Automation**: 2 cypress tests.

```Gherkin
Given a space with multiple <rule_type> rules installed
When the user selects rules in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And they should include an "immutable" field with a value of true
And their "ruleSource" "type" should be "external"
And their "ruleSource" "isCustomized" should depend be <is_customized>

Examples:
| rule_type               | is_customized |
| prebuilt customized     | true          |
| prebuilt non-customized | false         |
```

#### Scenario: Exporting custom rules in bulk

**Automation**: 1 cypress test.

```Gherkin
Given a space with multiple custom rules installed
When the user selects rules in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And they should include an "immutable" field with a value of false
And their "ruleSource" "type" should be "internal"
```

#### Scenario: Exporting both prebuilt and custom rules in bulk

**Automation**: 1 cypress test.

```Gherkin
Given a space with customized prebuilt, non-customized prebuilt and custom rules installed
When the user selects rules from each type in the rules table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And the prebuilt rules should include an "immutable" field with a value of true
And the custom rules should include an "immutable" field with a value of false
And the prebuilt rules' "ruleSource" "type" should be "external"
And the custom rules' "ruleSource" "type" should be "internal"
And the customized prebuilt rules' "isCustomized" value should be true
```

### Error Handling

#### Scenario: Exporting beyond the export limit

```Gherkin
Given a space with prebuilt and custom rules installed
And the number of rules is greater than the export limit (defaults to 10_000)
Then the request should be rejected as a bad request
```
