# Test plan: upgrading prebuilt rules that reference legacy ML jobs <!-- omit from toc -->

**Status**: `in progress`, matches [Milestone 3](https://github.com/elastic/kibana/issues/174168).

> [!TIP]
> If you're new to prebuilt rules, start with the [prebuilt rules test plans index](./prebuilt_rules.md) and the [overview of prebuilt rules features](./prebuilt_rules_common_info.md#features).

## Summary <!-- omit from toc -->

This is a test plan for upgrading a prebuilt Machine Learning (ML) rule when the upgrade would repoint it away from a legacy anomaly detection job the rule currently references.

Such an upgrade raises an [ML job coverage-loss conflict](./prebuilt_rules_common_info.md#common-terminology) on the rule's `machine_learning_job_id` field: keeping the current version means keeping the legacy job, so upgrading straight to the target version would silently drop the job and its anomaly detection coverage. The conflict replaces the former blocking "ML rule updates may override your existing rules" modal.

The behavior splits by license:

- with **rule customization enabled** (`Enterprise` / `Trial`) the conflict is `NON_SOLVABLE` and the user resolves it in the three-way-diff resolver, where they can keep the current job;
- with **rule customization disabled** (`Platinum`) the conflict surfaces as an informational warning only, and the rule upgrades to the target version.

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
  - [Detecting the coverage-loss conflict](#detecting-the-coverage-loss-conflict)
    - [**Scenario: Coverage loss is detected from rule content, independent of installed jobs**](#scenario-coverage-loss-is-detected-from-rule-content-independent-of-installed-jobs)
    - [**Scenario: No coverage-loss conflict when the update keeps the affected job or the job is not in the allowlist**](#scenario-no-coverage-loss-conflict-when-the-update-keeps-the-affected-job-or-the-job-is-not-in-the-allowlist)
  - [Upgrading a coverage-loss rule with rule customization enabled (Enterprise)](#upgrading-a-coverage-loss-rule-with-rule-customization-enabled-enterprise)
    - [**Scenario: User resolves the coverage-loss conflict from the Rule Management upgrades table and upgrades the rule**](#scenario-user-resolves-the-coverage-loss-conflict-from-the-rule-management-upgrades-table-and-upgrades-the-rule)
    - [**Scenario: User resolves the coverage-loss conflict from the Rule Details page and upgrades the rule**](#scenario-user-resolves-the-coverage-loss-conflict-from-the-rule-details-page-and-upgrades-the-rule)
    - [**Scenario: Bulk "Upgrade all" skips the coverage-loss rule and upgrades the other rules**](#scenario-bulk-upgrade-all-skips-the-coverage-loss-rule-and-upgrades-the-other-rules)
  - [Upgrading a coverage-loss rule with rule customization disabled (Platinum)](#upgrading-a-coverage-loss-rule-with-rule-customization-disabled-platinum)
    - [**Scenario: User is warned about coverage loss and can still upgrade the rule to the target version**](#scenario-user-is-warned-about-coverage-loss-and-can-still-upgrade-the-rule-to-the-target-version)
    - [**Scenario: User is warned about coverage loss and can still upgrade the rule from the Rule Details page**](#scenario-user-is-warned-about-coverage-loss-and-can-still-upgrade-the-rule-from-the-rule-details-page)
    - [**Scenario: Bulk "Upgrade all" upgrades the coverage-loss rule directly to the target version**](#scenario-bulk-upgrade-all-upgrades-the-coverage-loss-rule-directly-to-the-target-version)

## Useful information

### Tickets

- [Users can Customize Prebuilt Detection Rules: Milestone 3](https://github.com/elastic/kibana/issues/174168)
- [ML rule updates modal blocks all prebuilt rule upgrades](https://github.com/elastic/kibana/issues/239884)
- [Rule upgrade silently fails on Rule Details page with legacy ML jobs](https://github.com/elastic/kibana/issues/279791)
- [Prebuilt ML rule upgrade issues](https://github.com/elastic/sdh-security-team/issues/1698) (internal)

### Terminology

- [Common terminology](./prebuilt_rules_common_info.md#common-terminology), including [affected ML job](./prebuilt_rules_common_info.md#common-terminology) and [ML job coverage-loss conflict](./prebuilt_rules_common_info.md#common-terminology).
- **coverage-loss rule**: shorthand used in this plan for a prebuilt ML rule whose upgrade raises an ML job coverage-loss conflict.
- **coverage-loss warning**: the informational callout shown in the rule upgrade flyout when a rule would drop an affected ML job. It has no acknowledgment checkbox and does not block the upgrade.

## Requirements

### Assumptions

Assumptions about test environments and scenarios outlined in this test plan.

Unless explicitly indicated otherwise:

- [Common assumptions](./prebuilt_rules_common_info.md#common-assumptions).
- Package with prebuilt rules is already installed, and rule assets from it are stored in Elasticsearch.
- Machine Learning rules require at least a `Platinum` license, so these scenarios do not apply on `Basic`. The **rule customization disabled** scenarios are exercised on `Platinum` (ML available, customization off); the **rule customization enabled** scenarios are exercised on `Enterprise` or `Trial`.
- The coverage-loss conflict is detected from rule content, so it does not require the affected ML job to be installed.

### Technical requirements

Non-functional requirements for the functionality outlined in this test plan.

- [Common technical requirements](./prebuilt_rules_common_info.md#common-technical-requirements).
- Cypress e2e tests can run under `Trial` (equivalent to `Enterprise`) or `Basic`, but not `Platinum`. The **rule customization disabled** scenarios are therefore automated with FE integration and unit tests that disable rule customization, rather than with e2e tests.

### Product requirements

Functional requirements for the functionality outlined in this test plan.

- [Common product requirements](./prebuilt_rules_common_info.md#common-product-requirements).

User stories:

- User is warned before an upgrade silently drops a legacy ML job that the rule currently references and stops using it (a potential detection-coverage gap).
- With rule customization enabled, the warning is a `NON_SOLVABLE` conflict on the `machine_learning_job_id` field; the user resolves it in the three-way-diff resolver and can keep the current job.
- With rule customization disabled, the warning is informational only; the user can still upgrade the rule, which takes the target version.
- The warning does not depend on which ML jobs are installed or on ML privileges; it is derived from the rule's current and target `machine_learning_job_id` values and the affected-jobs allowlist.

## Scenarios

### Detecting the coverage-loss conflict

#### **Scenario: Coverage loss is detected from rule content, independent of installed jobs**

The `machine_learning_job_id` field is treated as an unordered set of job ids, and dropping an affected job produces a `NON_SOLVABLE` conflict whose merged value keeps the current job. The [diff algorithms test plan](./prebuilt_rule_upgrade_diff_algorithms.md#scenario-aab---rule-field-is-machine_learning_job_id-dropping-an-affected-ml-job) covers this field-level behavior.

**Automation**: unit tests for the `machine_learning_job_id` diff algorithm and the coverage-loss helper + FE unit tests for the client signal.

```Gherkin
Given a prebuilt ML rule is installed in Kibana
And the rule is outdated (a new version is available for this rule)
And the current version references an affected ML job (id in common/machine_learning/affected_job_ids.ts) that the target version drops
When the rule upgrade is reviewed
Then the machine_learning_job_id field should have a coverage-loss conflict
And the conflict should be raised whether or not the affected ML job is installed
```

#### **Scenario: No coverage-loss conflict when the update keeps the affected job or the job is not in the allowlist**

**Automation**: unit tests for the coverage-loss helper + 1 FE integration test.

```Gherkin
Given a prebuilt ML rule is installed in Kibana
And the rule is outdated (a new version is available for this rule)
And the update does not drop any affected ML job
When the rule upgrade is reviewed
Then the machine_learning_job_id field should NOT have a coverage-loss conflict
And user should NOT see the coverage-loss warning in the rule upgrade flyout

Examples:
  | case                                                             |
  | target keeps the affected job the current version references     |
  | current version references a job that is not in the allowlist    |
```

### Upgrading a coverage-loss rule with rule customization enabled (Enterprise)

#### **Scenario: User resolves the coverage-loss conflict from the Rule Management upgrades table and upgrades the rule**

**Automation**: 1 e2e test + 1 FE integration test.

```Gherkin
Given a coverage-loss rule is installed in Kibana under a license with rule customization enabled
When user opens the Prebuilt Rules Upgrades table
Then the rule's row should offer to "Review" the update instead of a one-click upgrade
When user opens the rule upgrade flyout
Then user should see the coverage-loss warning above the three-way-diff resolver
And the machine_learning_job_id field should show an unresolved conflict
And the "Update rule" button should be disabled
When user resolves the conflict
And user clicks the "Update rule" button
Then the rule should be upgraded
And user should see a success message
```

#### **Scenario: User resolves the coverage-loss conflict from the Rule Details page and upgrades the rule**

This also covers the fix for [#279791](https://github.com/elastic/kibana/issues/279791): the upgrade confirmation is surfaced inside the flyout rather than a separate modal that was never mounted on the Rule Details page.

**Automation**: 1 e2e test.

```Gherkin
Given a coverage-loss rule is installed in Kibana under a license with rule customization enabled
And the rule is outdated (a new version is available for this rule)
When user opens the Rule Details page
And user opens the rule upgrade flyout from the callout
Then the machine_learning_job_id field should show an unresolved conflict
When user resolves the conflict
And user clicks the "Update rule" button
Then the rule should be upgraded
And user should see a success message
And the callout to upgrade the rule should disappear
```

#### **Scenario: Bulk "Upgrade all" skips the coverage-loss rule and upgrades the other rules**

**Automation**: 1 e2e test.

```Gherkin
Given a coverage-loss rule and a conflict-free rule are installed in Kibana under a license with rule customization enabled
When user opens the Prebuilt Rules Upgrades table
And user clicks the "Upgrade all" button
Then user should see the conflicts modal offering to upgrade the conflict-free rules
When user confirms upgrading the conflict-free rules
Then the conflict-free rule should be upgraded
And the coverage-loss rule should NOT be upgraded
And the coverage-loss rule should remain in the upgrades table
```

### Upgrading a coverage-loss rule with rule customization disabled (Platinum)

#### **Scenario: User is warned about coverage loss and can still upgrade the rule to the target version**

**Automation**: 1 FE integration test.

```Gherkin
Given a coverage-loss rule is installed in Kibana under a license with rule customization disabled
When user opens the Prebuilt Rules Upgrades table
Then the rule's row should offer to "Review" the update instead of a one-click upgrade
When user opens the rule upgrade flyout
Then user should see the coverage-loss warning in the read-only diff
And the warning should NOT have an acknowledgment checkbox
And the "Update rule" button should be enabled
When user clicks the "Update rule" button
Then the rule should be upgraded to the target version
And user should see a success message
```

#### **Scenario: User is warned about coverage loss and can still upgrade the rule from the Rule Details page**

This also covers the fix for [#279791](https://github.com/elastic/kibana/issues/279791) with rule customization disabled.

**Automation**: 1 FE integration test.

```Gherkin
Given a coverage-loss rule is installed in Kibana under a license with rule customization disabled
And the rule is outdated (a new version is available for this rule)
When user opens the Rule Details page
And user opens the rule upgrade flyout from the callout
Then user should see the coverage-loss warning in the read-only diff
And the "Update rule" button should be enabled
When user clicks the "Update rule" button
Then the rule should be upgraded to the target version
And user should see a success message
And the callout to upgrade the rule should disappear
```

#### **Scenario: Bulk "Upgrade all" upgrades the coverage-loss rule directly to the target version**

With rule customization disabled, "Upgrade all" upgrades every rule straight to the target version with no dry run and no conflicts modal, so the coverage-loss rule is upgraded like the others. This guards the regression where the below-Enterprise bulk upgrade was rerouted through a dry run and conflicts modal.

**Automation**: 1 FE integration test.

```Gherkin
Given a coverage-loss rule is installed in Kibana under a license with rule customization disabled
When user opens the Prebuilt Rules Upgrades table
And user clicks the "Upgrade all" button
Then user should NOT see a conflicts modal
And the coverage-loss rule should be upgraded to the target version
And user should see a success message
```
