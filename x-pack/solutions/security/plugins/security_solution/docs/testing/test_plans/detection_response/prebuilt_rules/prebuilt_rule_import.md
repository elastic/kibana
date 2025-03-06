# Test plan: importing prebuilt rules <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, get started [here](./prebuilt_rules.md) and check an overview of the features of prebuilt rules in [this section](./prebuilt_rules_common_info.md#features).

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
  - [Terminology](#terminology)
- [Requirements](#requirements)
  - [Assumptions](#assumptions)
  - [Technical requirements](#technical-requirements)
  - [Product requirements](#product-requirements)
- [Scenarios](#scenarios)
  - [Importing single prebuilt non-customized rules](#importing-single-prebuilt-non-customized-rules)
    - [Scenario: Importing a non-customized rule when it's not installed](#scenario-importing-a-non-customized-rule-when-its-not-installed)
    - [Scenario: Importing a non-customized rule on top of an installed non-customized rule](#scenario-importing-a-non-customized-rule-on-top-of-an-installed-non-customized-rule)
    - [Scenario: Importing a non-customized rule on top of an installed customized rule](#scenario-importing-a-non-customized-rule-on-top-of-an-installed-customized-rule)
  - [Importing single prebuilt customized rules](#importing-single-prebuilt-customized-rules)
    - [Scenario: Importing a customized rule when it's not installed](#scenario-importing-a-customized-rule-when-its-not-installed)
    - [Scenario: Importing a customized rule on top of an installed non-customized rule](#scenario-importing-a-customized-rule-on-top-of-an-installed-non-customized-rule)
    - [Scenario: Importing a customized rule on top of an installed customized rule](#scenario-importing-a-customized-rule-on-top-of-an-installed-customized-rule)
  - [Importing single custom rules](#importing-single-custom-rules)
    - [Scenario: Importing a new custom rule](#scenario-importing-a-new-custom-rule)
    - [Scenario: Importing a custom rule on top of an existing custom rule](#scenario-importing-a-custom-rule-on-top-of-an-existing-custom-rule)
  - [Importing multiple rules in bulk](#importing-multiple-rules-in-bulk)
    - [Scenario: Importing both custom and prebuilt rules](#scenario-importing-both-custom-and-prebuilt-rules)
  - [Importing prebuilt rules when the package is not installed](#importing-prebuilt-rules-when-the-package-is-not-installed)
    - [Scenario: Importing a prebuilt rule when the rules package is not installed](#scenario-importing-a-prebuilt-rule-when-the-rules-package-is-not-installed)
  - [Converting between prebuilt and custom rules](#converting-between-prebuilt-and-custom-rules)
    - [Scenario: Importing a custom rule with a matching prebuilt `rule_id` and `version`](#scenario-importing-a-custom-rule-with-a-matching-prebuilt-rule_id-and-version)
    - [Scenario: Importing a prebuilt rule with a non-existent `rule_id`](#scenario-importing-a-prebuilt-rule-with-a-non-existent-rule_id)
    - [Scenario: Importing a custom rule before a prebuilt rule asset is created with the same `rule_id`](#scenario-importing-a-custom-rule-before-a-prebuilt-rule-asset-is-created-with-the-same-rule_id)
  - [Handling missing base versions](#handling-missing-base-versions)
    - [Scenario: Importing a prebuilt rule with a matching `rule_id` but no matching `version`](#scenario-importing-a-prebuilt-rule-with-a-matching-rule_id-but-no-matching-version)
  - [Handling missing fields in the import request payload](#handling-missing-fields-in-the-import-request-payload)
    - [Scenario: Importing a prebuilt rule without a `rule_id` field](#scenario-importing-a-prebuilt-rule-without-a-rule_id-field)
    - [Scenario: Importing a prebuilt rule with a matching `rule_id` but missing a `version` field](#scenario-importing-a-prebuilt-rule-with-a-matching-rule_id-but-missing-a-version-field)
    - [Scenario: Importing an existing custom rule missing a `version` field](#scenario-importing-an-existing-custom-rule-missing-a-version-field)
    - [Scenario: Importing a new custom rule missing a `version` field](#scenario-importing-a-new-custom-rule-missing-a-version-field)
  - [Handling request parameters: `overwrite` flag](#handling-request-parameters-overwrite-flag)
    - [Scenario: Importing a rule with `overwrite` flag set to true](#scenario-importing-a-rule-with-overwrite-flag-set-to-true)
    - [Scenario: Importing a rule with `overwrite` flag set to false](#scenario-importing-a-rule-with-overwrite-flag-set-to-false)
  - [Licensing](#licensing)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules](https://github.com/elastic/security-team/issues/1974) (internal)
- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [Allow importing prebuilt rules at the API level](https://github.com/elastic/kibana/issues/180168)
- [Benchmark performance of importing a large number of prebuilt rules](https://github.com/elastic/kibana/issues/195632)
- [Tests for prebuilt rule import/export workflow](https://github.com/elastic/kibana/issues/202079)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology).
- **This rule is not installed**: a prebuilt rule with the same `rule_id` hasn't been installed yet and doesn't exist as an alerting rule saved object.
- **This rule is already installed**: a prebuilt rule with the same `rule_id` has been already installed and exists as an alerting rule saved object.
- **This rule is not created yet**: a custom rule with the same `rule_id` hasn't been created yet and doesn't exist as an alerting rule saved object.
- **This rule is already created**: a custom rule with the same `rule_id` has been already created and exists as an alerting rule saved object.

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).
- The `overwrite` import request parameter is set to `true`, unless explicitly indicated otherwise.

### Technical requirements

Non-functional requirements for the functionality outlined in this test plan.

- [Common technical requirements](./prebuilt_rules_common_info.md#common-technical-requirements).

### Product requirements

Functional requirements for the functionality outlined in this test plan.

- [Common product requirements](./prebuilt_rules_common_info.md#common-product-requirements).

User stories:

- User can import a single prebuilt rule on the Rule Management page.
- User can import multiple prebuilt rules on the Rule Management page.
- User can import prebuilt non-customized rules.
- User can import prebuilt customized rules.
- User can import any combination of prebuilt non-customized, prebuilt customized, and custom rules.

## Scenarios

### Importing single prebuilt non-customized rules

#### Scenario: Importing a non-customized rule when it's not installed

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is equal to its base version
And this rule is not installed
When the user imports the rule
Then the rule should be created
And the created rule should be prebuilt
And the created rule should be marked as non-customized
And the created rule's parameters should match the import payload
```

#### Scenario: Importing a non-customized rule on top of an installed non-customized rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is equal to its base version
And this rule is already installed and is not customized
When the user imports the rule
Then the rule should be updated
And the updated rule should be prebuilt
And the updated rule should be marked as non-customized
And the updated rule's parameters should match the import payload
```

#### Scenario: Importing a non-customized rule on top of an installed customized rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is equal to its base version
And this rule is already installed and is customized
When the user imports the rule
Then the rule should be updated
And the updated rule should be prebuilt
And the updated rule should be marked as non-customized
And the updated rule's parameters should match the import payload
```

### Importing single prebuilt customized rules

#### Scenario: Importing a customized rule when it's not installed

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is different from its base version
And this rule is not installed
When the user imports the rule
Then the rule should be created
And the created rule should be prebuilt
And the created rule should be marked as customized
And the created rule's parameters should match the import payload
```

#### Scenario: Importing a customized rule on top of an installed non-customized rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is different from its base version
And this rule is already installed and is not customized
When the user imports the rule
Then the rule should be updated
And the updated rule should be prebuilt
And the updated rule should be marked as customized
And the updated rule's parameters should match the import payload
```

#### Scenario: Importing a customized rule on top of an installed customized rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And this rule has a base version (its rule_id and version match a rule asset)
And this rule is different from its base version
And this rule is already installed and is customized
When the user imports the rule
Then the rule should be updated
And the updated rule should be prebuilt
And the updated rule should be marked as customized
And the updated rule's parameters should match the import payload
```

### Importing single custom rules

#### Scenario: Importing a new custom rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a custom rule
And its rule_id does NOT match any rule assets from the installed package
And this rule is not created yet
When the user imports the rule
Then the rule should be created
And the created rule should be custom
And the created rule's parameters should match the import payload
```

#### Scenario: Importing a custom rule on top of an existing custom rule

**Automation**: 1 API integration test.

```Gherkin
Given the import payload contains a custom rule
And its rule_id does NOT match any rule assets from the installed package
And this rule is already created
When the user imports the rule
Then the rule should be updated
And the updated rule should be custom
And the updated rule's parameters should match the import payload
```

### Importing multiple rules in bulk

#### Scenario: Importing both custom and prebuilt rules

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains prebuilt non-customized, prebuilt customized, and custom rules
When the user imports these rules
Then custom rules should be created or updated, with versions defaulted to 1
And prebuilt rules should be created or updated,
And prebuilt rules missing versions should be rejected
```

### Importing prebuilt rules when the package is not installed

#### Scenario: Importing a prebuilt rule when the rules package is not installed

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And its rule_id matches one or a few rule assets from the latest package
And the package hasn't been installed yet
When the user imports the rule
Then the latest package should get installed automatically
And the rule should be created or updated
And the ruleSource type should be "external"
```

### Converting between prebuilt and custom rules

#### Scenario: Importing a custom rule with a matching prebuilt `rule_id` and `version`

**Automation**: 1 cypress test and 1 integration test.

```Gherkin
Given the import payload contains a custom rule
And its rule_id and version match a rule asset from the installed package
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be true
```

#### Scenario: Importing a prebuilt rule with a non-existent `rule_id`

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And its rule_id does NOT match any rule assets from the installed package
When the user imports the rule
Then the rule should be created
And the ruleSource type should be "internal"
```

#### Scenario: Importing a custom rule before a prebuilt rule asset is created with the same `rule_id`

**Automation**: 1 integration test.

```Gherkin
Given the environment contains an imported custom rule
And this rule has a rule_id of X
When a prebuilt rule asset is added with a rule_id of X
Then the imported custom rule should be upgradeable as if it were a prebuilt rule
```

### Handling missing base versions

#### Scenario: Importing a prebuilt rule with a matching `rule_id` but no matching `version`

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule
And its rule_id matches one or a few rule assets from the installed package
And its version does NOT match any of those rule assets
When the user imports the rule
Then the rule should be created or updated
And the ruleSource type should be "external"
And isCustomized should be true
```

### Handling missing fields in the import request payload

#### Scenario: Importing a prebuilt rule without a `rule_id` field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule without a rule_id field
When the user imports the rule
Then the import should be rejected with a message "rule_id field is required"
```

#### Scenario: Importing a prebuilt rule with a matching `rule_id` but missing a `version` field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a prebuilt rule without a version field
And its rule_id matches one or a few rule assets from the installed package
When the user imports the rule
Then the import should be rejected with a message "version field is required"
```

#### Scenario: Importing an existing custom rule missing a `version` field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a custom rule without a version field
And its rule_id does NOT match any rule assets from the installed package
And this custom rule has already been created
When the user imports the rule
Then the rule should be updated
And the ruleSource type should be "internal"
And the "version" field should be set to the existing rule's "version"
```

#### Scenario: Importing a new custom rule missing a `version` field

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a custom rule without a version field
And its rule_id does NOT match any rule assets from the installed package
And this custom rule hasn't been created yet
When the user imports the rule
Then the rule should be created
And the ruleSource type should be "internal"
And the "version" field should be set to 1
```

### Handling request parameters: `overwrite` flag

#### Scenario: Importing a rule with `overwrite` flag set to true

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a rule
And its rule_id matches a rule_id of one of the installed rules
And the overwrite flag is set to true
When the user imports the rule
Then the rule should be overwritten
And the ruleSource should be based on rule_id and version
```

#### Scenario: Importing a rule with `overwrite` flag set to false

**Automation**: 1 integration test.

```Gherkin
Given the import payload contains a rule
And its rule_id matches a rule_id of one of the installed rules
And the overwrite flag is set to false
When the user imports the rule
Then the import should be rejected with a message "rule_id already exists"

CASE: should have the same outcome for all rule types
```

### Licensing

TODO: describe licensing restrictions that apply to rule import.
