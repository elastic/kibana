# Test plan: Managed MITRE UI Integration <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

This is a test plan for the UI integration of the Managed MITRE Data Source feature: the `useMitreConfiguration()` hook that abstracts data source selection from consuming components, the MITRE ATT&CK technique picker in the rule create/edit page, the coverage overview matrix, and the AI rule creation cutover off the legacy blob.

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
  - [Product requirements](#product-requirements)
- [Scenarios](#scenarios)
  - [MITRE configuration hook](#mitre-configuration-hook)
    - [**Scenario: When the feature flag is off, the hook returns legacy blob data without making an API request**](#scenario-when-the-feature-flag-is-off-the-hook-returns-legacy-blob-data-without-making-an-api-request)
    - [**Scenario: When the feature flag is on, the hook fetches from the entities API**](#scenario-when-the-feature-flag-is-on-the-hook-fetches-from-the-entities-api)
    - [**Scenario: The hook caches data and does not re-fetch on subsequent renders**](#scenario-the-hook-caches-data-and-does-not-re-fetch-on-subsequent-renders)
    - [**Scenario: The hook exposes a loading state while the fetch is in flight**](#scenario-the-hook-exposes-a-loading-state-while-the-fetch-is-in-flight)
    - [**Scenario: The hook exposes typed buckets**](#scenario-the-hook-exposes-typed-buckets)
    - [**Scenario: Consuming components receive the same data shape from both data sources**](#scenario-consuming-components-receive-the-same-data-shape-from-both-data-sources)
    - [**Scenario: The hook exposes an error state when the entities API request fails**](#scenario-the-hook-exposes-an-error-state-when-the-entities-api-request-fails)
  - [Technique picker](#technique-picker)
    - [**Scenario: User can open the technique picker and see all active tactics and techniques**](#scenario-user-can-open-the-technique-picker-and-see-all-active-tactics-and-techniques)
    - [**Scenario: A multi-tactic technique appears under each of its associated tactics**](#scenario-a-multi-tactic-technique-appears-under-each-of-its-associated-tactics)
    - [**Scenario: User sees a loading indicator in the MITRE section while data is being fetched**](#scenario-user-sees-a-loading-indicator-in-the-mitre-section-while-data-is-being-fetched)
    - [**Scenario: User can select a tactic and technique and save the rule**](#scenario-user-can-select-a-tactic-and-technique-and-save-the-rule)
    - [**Scenario: The technique picker shows an error state when MITRE data fails to load**](#scenario-the-technique-picker-shows-an-error-state-when-mitre-data-fails-to-load)
  - [Coverage overview](#coverage-overview)
    - [**Scenario: Tactics are ordered by the `position` field from the managed data source**](#scenario-tactics-are-ordered-by-the-position-field-from-the-managed-data-source)
    - [**Scenario: Techniques are associated with their correct tactics**](#scenario-techniques-are-associated-with-their-correct-tactics)
    - [**Scenario: A multi-tactic technique is associated with all applicable tactics**](#scenario-a-multi-tactic-technique-is-associated-with-all-applicable-tactics)
    - [**Scenario: The coverage overview shows a loading state while data loads**](#scenario-the-coverage-overview-shows-a-loading-state-while-data-loads)
    - [**Scenario: The coverage overview shows an error state when MITRE data fails to load**](#scenario-the-coverage-overview-shows-an-error-state-when-mitre-data-fails-to-load)
    - [**Scenario: Changing coverage overview filters does not trigger a re-fetch of MITRE data**](#scenario-changing-coverage-overview-filters-does-not-trigger-a-re-fetch-of-mitre-data)
    - [**Scenario: User can view the coverage overview with the flag off**](#scenario-user-can-view-the-coverage-overview-with-the-flag-off)
  - [AI rule creation](#ai-rule-creation)
    - [**Scenario: AI rule creation loads the managed data source**](#scenario-ai-rule-creation-loads-the-managed-data-source)

## Useful information

### Tickets

- [Common tickets](./mitre_common_info.md#tickets).

### Terminology

- [Common terminology](./mitre_common_info.md#terminology).
- **MITRE hook** (`useMitreConfiguration()`): React Query hook consumed by the technique picker and coverage overview. Abstracts the active data source (legacy blob when the feature flag is off/entities API when on) so consuming components require no branching. Results are cached by React Query for the lifetime of the React Query client scope; subsequent calls within that scope return the cached result without issuing a new request.
- **MITRE ATT&CK technique picker**: The component on the rule create/edit page that allows a user to select MITRE entities in a tiered way (e.g. first you select tactic, then the techniques that belong to that tactic, then the sub-techniques that belong to that technique)

## Requirements

### Assumptions

- [Common assumptions](./mitre_common_info.md#common-assumptions).
- All scenarios assume an Enterprise license unless stated otherwise.
- The user has the necessary access to reach the relevant Security Solution pages.

### Product requirements

- [Common product requirements](./mitre_common_info.md#common-product-requirements).
- User opening the rule create/edit page sees the MITRE technique picker populated with the same set of active tactics and techniques whether the flag is on or off (parity with the legacy path).
- User viewing the coverage overview sees tactics ordered by their `position` field; no hardcoded ordering is consulted.
- A new MITRE version added to the artifact produces correct coverage overview ordering without any code change.
- Revoked and deprecated MITRE entities are excluded from the technique picker and coverage overview by default.

## Scenarios

### MITRE configuration hook

#### **Scenario: When the feature flag is off, the hook returns legacy blob data without making an API request**

**Automation**: 1 React unit test.

```Gherkin
Given the feature flag is disabled
When useMitreConfiguration() is called
Then the hook should return MITRE entities sourced from the legacy blob
And no HTTP request to the entities API should be made
```

#### **Scenario: When the feature flag is on, the hook fetches from the entities API**

**Automation**: 1 React unit test.

```Gherkin
When useMitreConfiguration() is called
Then the hook should issue one GET request to the entities API
And return MITRE entities populated from the API response
```

#### **Scenario: The hook caches data and does not re-fetch on subsequent renders**

**Automation**: 1 React unit test.

```Gherkin
Given useMitreConfiguration() has already resolved and cached its result
When additional components mount and call the hook within the same React Query client scope
Then no additional GET request to the entities API should be made
And the cached entity data should be returned immediately
```

#### **Scenario: The hook exposes a loading state while the fetch is in flight**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API request has not yet resolved
When useMitreConfiguration() is called
Then the hook should expose a loading indicator
```

#### **Scenario: The hook exposes typed buckets**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API returns a full payload
When useMitreConfiguration() resolves
Then the hook should expose a tactics array, a techniques array, and a subtechniques array
```

#### **Scenario: Consuming components receive the same data shape from both data sources**

**Automation**: 2 React unit tests — one with flag off, one with flag on.

```Gherkin
When useMitreConfiguration() resolves with the flag disabled and data from the legacy blob
And separately when it resolves with the flag enabled and data from the API
Then the shape of the returned MitreEntitySummaryCollection should be identical in both cases
And consuming components should require no conditional branching to differentiate the two sources
```

#### **Scenario: The hook exposes an error state when the entities API request fails**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API request fails with an error
When useMitreConfiguration() is called
Then the hook should expose an error state
And the returned entity buckets should be empty
```

### Technique picker

#### **Scenario: User can open the technique picker and see all active tactics and techniques**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create/edit page
When user opens the MITRE ATT&CK technique picker
Then the picker should display all active tactics from the managed data source
And each tactic should list its associated techniques and subtechniques
```

#### **Scenario: A multi-tactic technique appears under each of its associated tactics**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create/edit page
And the managed MITRE data contains a technique associated with more than one tactic
When user opens the MITRE ATT&CK technique picker and expands each applicable tactic
Then the technique should appear as a selectable option under every tactic it belongs to
```

#### **Scenario: User sees a loading indicator in the MITRE section while data is being fetched**

**Automation**: 1 React unit test.

```Gherkin
Given a user opens the rule create/edit page before MITRE data has finished loading
Then a loading skeleton or spinner should appear in the MITRE ATT&CK section
And the rest of the form should remain interactive
```

#### **Scenario: User can select a tactic and technique and save the rule**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create/edit page
When user opens the MITRE ATT&CK technique picker and selects a tactic and a technique
And user completes the required fields and saves the rule
Then the rule should be saved successfully
And the saved rule's threat field should contain the selected tactic and technique entries
```

#### **Scenario: The technique picker shows an error state when MITRE data fails to load**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given the entities API request fails with an error
When a user opens the rule create/edit page
Then an error toast should appear in kibana
And an error message should appear in the MITRE ATT&CK form section
And the rest of the form should remain interactive
```

### Coverage overview

#### **Scenario: Tactics are ordered by the `position` field from the managed data source**

**Automation**: 1 Cypress e2e test.

```Gherkin
When the coverage overview page loads
Then tactics should be rendered in ascending order of each tactic's position field
```

#### **Scenario: Techniques are associated with their correct tactics**

**Automation**: 1 Cypress e2e test.

```Gherkin
When the coverage overview page loads
Then each technique should be bound to a tactic whose ID appears in that technique's tactic_ids
And no technique should appear bound to a tactic whose ID is absent from its tactic_ids
```

#### **Scenario: A multi-tactic technique is associated with all applicable tactics**

**Automation**: 1 Cypress e2e test or unit test for graph builder.

```Gherkin
Given the managed MITRE data contains a technique whose tactic_ids lists more than one tactic
When the coverage overview page loads
Then the technique should appear bound to every tactic listed in its tactic_ids
```

#### **Scenario: The coverage overview shows a loading state while data loads**

**Automation**: 1 React unit test.

```Gherkin
Given useMitreConfiguration() is in the loading state
When the coverage overview renders
Then a loading indicator should appear in place of the matrix
And the page should not render an empty or broken grid
```

#### **Scenario: The coverage overview shows an error state when MITRE data fails to load**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API request fails with an error
When the coverage overview page renders
Then an error message should appear in place of the matrix
And the page should not render an empty or broken grid
```

#### **Scenario: Changing coverage overview filters does not trigger a re-fetch of MITRE data**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the coverage overview page and MITRE data has already been loaded
When the user changes a page filter such as rule status or tags
Then no new request to the entities API should be made
And the tactic and technique structure of the matrix should remain unchanged
```

#### **Scenario: User can view the coverage overview with the flag off**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given the feature flag is disabled
When the coverage overview page loads
Then tactic columns should be rendered in the order defined by the legacy hardcoded tacticOrder array
And each technique cell should appear under its correct tactic column
And the page should render without errors
```

### AI rule creation

#### **Scenario: AI rule creation loads the managed data source**

**Automation**: 1 unit test.

```Gherkin
When the AI rule creation workflow requests MITRE entity data
Then the workflow should source MITRE data from the managed data client
And no direct import of the legacy blob should occur
```
