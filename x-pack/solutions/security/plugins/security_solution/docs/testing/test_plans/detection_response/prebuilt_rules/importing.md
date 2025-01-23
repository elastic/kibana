# Detections Rule Import

This is a test plan for the importing of prebuilt and custom rules. This feature is an aspect of `Milestone 3` of the [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974) epic.

Status: `in progress`.

## Useful information

### Tickets

- [Rule Immutability/Customization](https://github.com/elastic/security-team/issues/1974)
- [Rule Importing Feature](https://github.com/elastic/kibana/issues/180168)
- [Rule Import API PR](https://github.com/elastic/kibana/pull/190198)

### Terminology

- **prebuilt rule**: A rule contained in our `Prebuilt Security Detection Rules` integration in Fleet.
- **custom rule**: A rule defined by the user, which has no relation to the prebuilt rules
- **rule source, or ruleSource**: A field on the rule that defines the rule's categorization

## Scenarios

### Core Functionality

#### Scenario: Importing an unmodified prebuilt rule with a matching rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule with a matching rule_id and version, identical to the published rule
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be false
```

#### Scenario: Importing a customized prebuilt rule with a matching rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule with a matching rule_id and version, modified from the published version
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be true

CASE: Should work with older, newer, or identical version numbers
```

#### Scenario: Importing a custom rule with a matching rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a custom rule with a matching rule_id and version
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be updated
And the ruleSource type should be "internal"
```

#### Scenario: Importing a prebuilt rule with a matching rule_id but no matching version

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule with a matching rule_id but no matching version
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be created
And the ruleSource type should be "external"
And isCustomized should be true
```

#### Scenario: Importing a prebuilt rule with a non-existent rule_id

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule with a non-existent rule_id
When the user imports the rule
Then the rule should be created
And the ruleSource type should be "internal"
```

#### Scenario: Importing a prebuilt rule without a rule_id field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule without a rule_id field
When the user imports the rule
Then the import should be rejected with a message "rule_id field is required"
```

#### Scenario: Importing a prebuilt rule with a matching rule_id but missing a version field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule without a version field
When the user imports the rule
Then the import should be rejected with a message "version field is required"
```

#### Scenario: Importing an existing custom rule missing a version field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains an existing custom rule without a version field
When the user imports the rule
Then the rule should be updated
And the ruleSource type should be "internal"
And the "version" field should be set to the existing rule's "version"
```

#### Scenario: Importing a new custom rule missing a version field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a new custom rule without a version field
When the user imports the rule
Then the rule should be created
And the ruleSource type should be "internal"
And the "version" field should be set to 1
```

#### Scenario: Importing a rule with overwrite flag set to true

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a rule with an existing rule_id
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be overwritten
And the ruleSource type should be calculated based on the rule_id and version
```

#### Scenario: Importing a rule with overwrite flag set to false

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a rule with an existing rule_id
And the overwrite flag is set to false
When the user imports the rule
Then the import should be rejected with a message "rule_id already exists"

CASE: should have the same outcome for all rule types
```

#### Scenario: Importing both custom and prebuilt rules

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains modified and unmodified, custom and prebuilt rules
When the user imports the rule
Then custom rules should be created or updated, with versions defaulted to 1
And prebuilt rules should be created or updated,
And prebuilt rules missing versions should be rejected
```

#### Scenario: Importing prebuilt rules when the rules package is not installed

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains prebuilt rules
And no rules package has been installed locally
When the user imports the rule
Then all rules should be created or updated as custom rules
```

#### Scenario: User imports a custom rule before a prebuilt rule asset is created with the same rule_id

**Automation**: 1 integration test.

```Gherkin
Given the environment contains an imported custom rule
And this rule has a rule_id of X
When a prebuilt rule asset is added with a rule_id of X
Then the imported custom rule should be upgradeable as if it were a prebuilt rule
```
