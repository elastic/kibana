# Test plan: importing prebuilt rules <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

## Summary <!-- omit from toc -->

This is a test plan for the workflows of:

- importing prebuilt non-customized rules
- importing prebuilt customized rules
- importing any mixture of prebuilt and custom rules

from the Rule Management page.

## Table of contents <!-- omit from toc -->

<!--
Please use the "Markdown All in One" VS Code extension to keep the TOC in sync with the text:
https://marketplace.visualstudio.com/items?itemName=yzhang.markdown-all-in-one
-->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [User stories](#user-stories)
  - [Terminology](#terminology)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
- [Scenarios](#scenarios)
  - [Core Functionality](#core-functionality)
    - [Scenario: Importing an unmodified prebuilt rule with a matching rule_id and version](#scenario-importing-an-unmodified-prebuilt-rule-with-a-matching-rule_id-and-version)
    - [Scenario: Importing a customized prebuilt rule with a matching rule_id and version](#scenario-importing-a-customized-prebuilt-rule-with-a-matching-rule_id-and-version)
    - [Scenario: Importing a custom rule with a matching rule_id and version](#scenario-importing-a-custom-rule-with-a-matching-rule_id-and-version)
    - [Scenario: Importing a prebuilt rule with a matching rule_id but no matching version](#scenario-importing-a-prebuilt-rule-with-a-matching-rule_id-but-no-matching-version)
    - [Scenario: Importing a prebuilt rule with a non-existent rule_id](#scenario-importing-a-prebuilt-rule-with-a-non-existent-rule_id)
    - [Scenario: Importing a prebuilt rule without a rule_id field](#scenario-importing-a-prebuilt-rule-without-a-rule_id-field)
    - [Scenario: Importing a prebuilt rule with a matching rule_id but missing a version field](#scenario-importing-a-prebuilt-rule-with-a-matching-rule_id-but-missing-a-version-field)
    - [Scenario: Importing an existing custom rule missing a version field](#scenario-importing-an-existing-custom-rule-missing-a-version-field)
    - [Scenario: Importing a new custom rule missing a version field](#scenario-importing-a-new-custom-rule-missing-a-version-field)
    - [Scenario: Importing a rule with overwrite flag set to true](#scenario-importing-a-rule-with-overwrite-flag-set-to-true)
    - [Scenario: Importing a rule with overwrite flag set to false](#scenario-importing-a-rule-with-overwrite-flag-set-to-false)
    - [Scenario: Importing both custom and prebuilt rules](#scenario-importing-both-custom-and-prebuilt-rules)
    - [Scenario: Importing prebuilt rules when the rules package is not installed](#scenario-importing-prebuilt-rules-when-the-rules-package-is-not-installed)
    - [Scenario: User imports a custom rule before a prebuilt rule asset is created with the same rule_id](#scenario-user-imports-a-custom-rule-before-a-prebuilt-rule-asset-is-created-with-the-same-rule_id)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Allow importing prebuilt rules at the API level](https://github.com/elastic/kibana/issues/180168)
- [Benchmark performance of importing a large number of prebuilt rules](https://github.com/elastic/kibana/issues/195632)
- [Tests for prebuilt rule import/export workflow](https://github.com/elastic/kibana/issues/202079)

### User stories

**Prebuilt rule import workflow:**

- User can import a single prebuilt rule on the Rule Management page.
- User can import multiple prebuilt rules on the Rule Management page.
- User can import prebuilt non-customized rules.
- User can import prebuilt customized rules.
- User can import any combination of prebuilt non-customized, prebuilt customized, and custom rules.

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).

### Assumptions

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).

### Non-functional requirements

- [Common non-functional requirements](./prebuilt_rules_common_info.md#common-non-functional-requirements).

## Scenarios

### Core Functionality

#### Scenario: Importing an unmodified prebuilt rule with a matching rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains an unmodified prebuilt rule
And its rule_id and version match a rule asset from the installed package
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be false
```

#### Scenario: Importing a customized prebuilt rule with a matching rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a modified prebuilt rule
And its rule_id and version match a rule asset from the installed package
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be true
```

#### Scenario: Importing a custom rule with a matching prebuilt rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a custom rule with a matching rule_id and version
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
```

#### Scenario: Importing a custom rule with a matching custom rule_id and version

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a custom rule with a matching rule_id and version
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "internal"
```

#### Scenario: Importing a prebuilt rule with a matching rule_id but no matching version

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And its rule_id matches a rule asset from the installed package
And the version does not match the rule asset's version
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be true
```

#### Scenario: Importing a prebuilt rule with a non-existent rule_id

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And its rule_id does NOT match a rule asset from the installed package
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
Given the import payload contains a rule
And its rule_id matches a rule_id of one of the installed rules
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be overwritten
And the ruleSource should be based on rule_id and version
```

#### Scenario: Importing a rule with overwrite flag set to false

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a rule
And its rule_id matches a rule_id of one of the installed rules
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
Then the latest prebuilt rules package should get installed automatically
```

#### Scenario: User imports a custom rule before a prebuilt rule asset is created with the same rule_id

**Automation**: 1 integration test.

```Gherkin
Given the environment contains an imported custom rule
And this rule has a rule_id of X
When a prebuilt rule asset is added with a rule_id of X
Then the imported custom rule should be upgradeable as if it were a prebuilt rule
```
