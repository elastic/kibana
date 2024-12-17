# Prebuilt Rule Export

This is a test plan for the exporting of prebuilt rules. This feature is an aspect of `Milestone 2` of the [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic.

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

#### Scenario: Exporting prebuilt rule individually
```Gherkin
Given a space with prebuilt rules installed
When the user selects "Export rule" from the "All actions" dropdown on the rule's page
Then the rule should be exported as an NDJSON file
And it should include an "immutable" field with a value of true
And its "ruleSource" "type" should be "external"
And its "ruleSource" "isCustomized" value should depend on whether the rule was customized
```

#### Scenario: Exporting prebuilt rules in bulk
```Gherkin
Given a space with prebuilt rules installed
When the user selects prebuilt rules in the alerts table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And they should include an "immutable" field with a value of true
And their "ruleSource" "type" should be "external"
And their "ruleSource" "isCustomized" should depend on whether the rule was customized
```

#### Scenario: Exporting both prebuilt and custom rules in bulk
```Gherkin
Given a space with prebuilt and custom rules installed
When the user selects prebuilt rules in the alerts table
And chooses "Export" from bulk actions
Then the selected rules should be exported as an NDJSON file
And the prebuilt rules should include an "immutable" field with a value of true
And the custom rules should include an "immutable" field with a value of false
And the prebuilt rules' "ruleSource" "type" should be "external"
And the custom rules' "ruleSource" "type" should be "internal"
```

### Error Handling

#### Scenario: Exporting beyond the export limit
```Gherkin
Given a space with prebuilt and custom rules installed
And the number of rules is greater than the export limit (defaults to 10_000)
Then the request should be rejected as a bad request
```
