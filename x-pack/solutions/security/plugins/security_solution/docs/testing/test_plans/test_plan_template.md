# Test plan: my awesome feature <!-- omit from toc -->

<!-- Convey the plan's current status, e.g. are you expecting to finalize it in your PR, or later. -->
**Status**: `in progress`. <!-- `in progress` | `done` -->

## Summary <!-- omit from toc -->

<!-- Elaborate on what are we testing here, explain what the Awesome Feature is about. -->
This is a test plan for ...

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
  - [Section 1](#section-1)
    - [**Scenario: Title of scenario 1.1**](#scenario-title-of-scenario-11)
    - [**Scenario: Title of scenario 1.2**](#scenario-title-of-scenario-12)
  - [Section 2](#section-2)
    - [**Scenario: Title of scenario 2.1**](#scenario-title-of-scenario-21)

## Useful information

### Tickets

<!-- Add links to any related tickets. -->

- [Awesome Feature's epic](https://github.com/elastic/security-team/issues/9999)
- [Add tests for the new awesome feature](https://github.com/elastic/kibana/issues/999999)
- [Document the new awesome feature](https://github.com/elastic/security-docs/issues/9999)

### Terminology

<!--
  Explain special terminology around the feature.
  This would allow you to write more concise scenarios, which would improve readability.
-->

- **Term 1**: explanation.
- **Term 2**: explanation.

## Requirements

### Assumptions

<!--
  Mention any assumptions for the scenarios that are not explicitly stated in their steps.
  For example, you could describe:
  - license assumptions: all scenarios are executed under the Basic license, unless indicated otherwise
  - RBAC assumptions: user has the required privileges to normally access the feature
  - data setup: user has certain saved objects, source events, alerts, etc in the system
-->

Assumptions about test environments and scenarios outlined in this test plan.

- Assumption 1.
- Assumption 2.

### Technical requirements

<!--
  Describe any non-function requirements for the feature, if you have any. These could be about:
  - existence or lack of any data in Elasticsearch
  - scale: size of data (number or size of objects), number of Elasticsearch or Kibana nodes, etc
  - performance
  - resilience and error handling
  - observability: APM instrumentation, console logging, event log, correlation ids
  - testing
-->

Non-functional requirements for the functionality outlined in this test plan.

- Requirement 1.
- Requirement 2.

### Product requirements

<!--
  Describe any function requirements for the feature. This may include:
  - user stories
  - acceptance criteria
  - any other relevant details and comments about the UX or UI
-->

Functional requirements for the functionality outlined in this test plan.

User stories:

- User can do X.
- User can do Y.

## Scenarios

<!--
  Add scenarios for the feature. Split them into meaningful sections (groups) of related scenarios.
  The goal of having sections is to make it easier to navigate the test plan:
  - there shouldn't be too many sections with few scenarios in each -- it would be hard to see
    the whole picture of how the feature works
  - there shouldn't bee too few sections with a lot of scenarios in each

  For example, here's some typical sections you might want to add:
  - "Core functionality". Happy paths, base use cases, etc. Split it into several sections if
    there's too many scenarios for it.
  - "Error handling"
  - "Authorization / RBAC"
  - "Kibana upgrade"
-->

### Section 1

#### **Scenario: Title of scenario 1.1**

<!-- Describe how are you planning to automate this scenario -->
**Automation**: X e2e tests + Y integration tests + unit tests.

<!-- Use Gherkin syntax to describe the scenario https://cucumber.io/docs/gherkin/ -->
```Gherkin
Given ...
When ...
Then ...
```

<!-- Consider adding any other useful notes and clarifications for the scenario -->

#### **Scenario: Title of scenario 1.2**

**Automation**: X e2e tests + Y integration tests + unit tests.

```Gherkin
Given ...
When ...
Then ...
```

### Section 2

#### **Scenario: Title of scenario 2.1**

**Automation**: X e2e tests + Y integration tests + unit tests.

```Gherkin
Given ...
When ...
Then ...
```
