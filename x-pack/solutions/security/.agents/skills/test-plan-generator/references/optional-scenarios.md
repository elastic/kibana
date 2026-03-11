# Optional Scenario Templates and Gherkin Reference

This file contains the Gherkin templates for optional test plan sections, and the Gherkin formatting rules that apply to all scenarios. Read this file when generating or reviewing any test scenarios.

---

## Optional section templates

Include each optional section only when the evidence clearly supports it. If it is not clear whether a section applies, ask the user before including — do not include sections speculatively.

| Section | Include if |
|---|---|
| **RBAC** | Issue explicitly mentions roles, permissions, or access control |
| **Multi-space** | Feature involves UI, data, or configuration that could differ between Kibana spaces |
| **Multi-tenant** | Feature involves data ingestion, index patterns, or configuration in a Serverless or ECH deployment |
| **Upgrade** | Feature modifies stored data, index mappings, saved objects, configuration, or navigation structure |
| **CCS** | Feature queries Elasticsearch indices — especially Alerts index or detection rules |

For RBAC: no template — write scenarios manually based on the roles described in the issue.
For all others: use the templates below.

---

### Multi-space scenarios

```gherkin
@multi_space
Scenario: Feature behaves correctly in a non-default space
  Given user is in a Kibana space other than the default space
  And the feature flag is enabled
  When user performs the main action of the feature
  Then the behaviour is consistent with the default space

@multi_space
Scenario: Feature data is isolated between spaces
  Given the feature has been configured in Space A
  When user switches to Space B
  Then the configuration from Space A is not visible or applied in Space B
```

---

### Multi-tenant scenarios

```gherkin
@multi_tenant
Scenario: Feature works correctly in a serverless environment
  Given user is on a serverless Kibana project
  And the feature flag is enabled
  When user performs the main action of the feature
  Then the behaviour is equivalent to a self-managed deployment

@multi_tenant
Scenario: Feature data is isolated between tenants
  Given two separate tenants with independent deployments
  When Tenant A configures the feature
  Then Tenant B cannot access or see Tenant A's configuration
```

---

### Upgrade scenarios

Use `TARGET_VERSION` (detected in Step 2) as the target version. Run upgrade scenarios from each of the following source versions:
- `8.19.x` (last minor of 8.x)
- `9.3` (last minor of current major cycle)

```gherkin
@upgrade
Scenario: Feature works correctly after upgrading from 8.19.x to TARGET_VERSION
  Given a Kibana instance running version 8.19.x with existing data relevant to this feature
  When the instance is upgraded to TARGET_VERSION
  Then the feature is accessible and behaves as expected
  And existing data or configuration is preserved without errors

@upgrade
Scenario: Feature works correctly after upgrading from 9.3 to TARGET_VERSION
  Given a Kibana instance running version 9.3 with existing data relevant to this feature
  When the instance is upgraded to TARGET_VERSION
  Then the feature is accessible and behaves as expected
  And existing data or configuration is preserved without errors
```

---

### Cross-cluster Search (CCS) scenarios

```gherkin
@ccs
Scenario: Feature returns results from a remote cluster
  Given a Kibana instance configured with a remote cluster
  And the remote cluster contains data relevant to this feature
  When user performs a search or view action using this feature
  Then results from the remote cluster are included in the output
  And no errors or empty states are shown due to the remote cluster

@ccs
Scenario: Feature handles remote cluster unavailability gracefully
  Given a Kibana instance configured with a remote cluster
  And the remote cluster is unavailable or unreachable
  When user performs a search or view action using this feature
  Then the feature displays results from the local cluster only
  And an appropriate warning or indicator is shown for the unavailable cluster
```

---

## Gherkin rules (strictly enforced)

- Always use **third person**: "user", never "I"
- Each scenario tests **one thing only** — one When/Then pair maximum
- Maximum **7 steps** per scenario (Given + When + Then + And lines combined)
- Every scenario must have a **Given**
- Use **plain, readable language** — non-technical people must understand it
- **Describe behaviour and intent, not UI interactions** — write what the user achieves, not which buttons they click. `When user views the feature page` is correct. `When user clicks "Feature" in the submenu` is an anti-pattern.

Example of a correctly structured scenario:

```gherkin
@smoke @navigation
Scenario: Feature page is accessible from the main navigation
  Given user is authenticated and on any application page
  When user navigates to the Feature page
  Then the Feature page is displayed
  And the URL reflects the Feature page location
```

---

## Tags

- `@smoke` — critical happy-path scenarios
- `@navigation`, `@filters`, `@search`, `@workflow` — functional area tags
- `@rbac` — permission scenarios (only if the issue mentions roles, permissions, or access control)
- `@edge_case` — boundary and error scenarios
- `@multi_space`, `@multi_tenant`, `@upgrade`, `@ccs` — optional coverage area tags

---

## Priority levels

Priority is assigned based on **impact**, not scenario type. An edge case or error handling scenario can be P0 if failure would block core functionality or cause data loss.

- **P0 (Critical):** Failure blocks core functionality, causes data loss, or creates a security risk.
- **P1 (High):** Failure significantly degrades an important workflow or user-facing feature.
- **P2 (Medium):** Failure has limited impact or affects only non-critical paths.

---

## Formatting for GitHub comments

- Write Gherkin blocks inside triple backtick code fences tagged as `gherkin`
- Use `###` for feature section headers
- Use `---` horizontal rules between feature sections
- No emojis except for the `⚠️` assumption flag