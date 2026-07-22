# Optional Scenario Templates and Gherkin Reference

This file contains the Gherkin templates for optional test plan sections, and the Gherkin formatting rules that apply to all scenarios. Read this file when generating or reviewing any test scenarios.

---

## Contents

- [Coverage guidance](#coverage-guidance)
- [Always-evaluated coverage](#always-evaluated-coverage)
  - [Upgrade scenarios](#upgrade-scenarios)
- [Optional section templates](#optional-section-templates)
  - [Multi-space scenarios](#multi-space-scenarios)
  - [Multi-tenant scenarios](#multi-tenant-scenarios)
  - [Cross-cluster Search (CCS) scenarios](#cross-cluster-search-ccs-scenarios)
- [Gherkin rules](#gherkin-rules-strictly-enforced)
- [Tags](#tags)
- [Priority levels](#priority-levels)
- [Formatting for GitHub comments](#formatting-for-github-comments)

---

## Coverage guidance

These are functional test plans. Do not include performance, accessibility, security, i18n, or visual regression testing — those belong to dedicated test suites outside this skill's scope.

For each feature area in the plan, apply the testing types marked as **Required** for that feature type. Apply **Recommended** types when the sources (issue, PRs, Figma) provide enough context to write meaningful scenarios. **Conditional** types apply only when the specific condition is met.

| Testing type | Description | When to apply |
|---|---|---|
| **Positive** | Feature works as expected under correct conditions | Always required |
| **Negative** | Feature behaves correctly under incorrect conditions — invalid inputs, insufficient permissions, empty states, missing data | Always required — at least one per feature area |
| **Edge cases** | Behaviour at the boundaries of the domain — limits, extreme values, empty collections, maximum allowed inputs | Required when the feature has explicit limits or boundary conditions; recommended otherwise |
| **State-based** | Behaviour depends on prior state — session state, dismissed UI elements, previously saved configuration | Required when the feature has persistent or session-based state |
| **Error handling** | Feature degrades gracefully when an external dependency fails — API timeout, unavailable service, unexpected response | Required when the feature makes calls to external APIs or services |

**Applying this in practice:**

| Feature type | Positive | Negative | Edge cases | State-based | Error handling |
|---|---|---|---|---|---|
| Read / display data | Required | Required | Recommended | Conditional | Conditional |
| Write / modify data | Required | Required | Required | Conditional | Required |
| Settings / configuration | Required | Required | Required | Conditional | Conditional |
| Permissions / RBAC | Required | Required | Recommended | Conditional | Rarely applicable |
| Features with explicit limits | Required | Required | Required | Conditional | Conditional |
| Dismissible / session UI elements | Required | Recommended | Rarely applicable | Required | Rarely applicable |

If a required testing type has no applicable scenario for a given feature area — for example, a read-only display feature with no external API calls — note it explicitly in Known Limitations rather than leaving it uncovered silently.

---

## Always-evaluated coverage

These coverage areas are **evaluated on every generation run**, not included on a per-feature "should I add this?" basis. They either produce scenarios or produce an explicit *Out of scope* bullet with a one-clause reason. Never omit them silently.

| Coverage | Trigger | Scope decision |
|---|---|---|
| **Upgrade / migration** | Feature ships changes to Elasticsearch mappings, saved-object types or migrations, Kibana config keys, or navigation — **regardless of feature-flag state, default availability, or milestone in which the flag is expected to flip on** | In scope. Use the Upgrade template below. If genuinely out of scope, state the reason under *Out of scope* (a flag being off is **not** a valid reason — the underlying change ships anyway). |
| **CRUD per persisted object** | Every persisted object the feature touches — including objects reachable only through the platform's generic Cases / SO / Fleet / Alerts endpoints, and objects the PR narrative did not exercise | In scope. Walk `Create` / `Read` / `Update` / `Delete` for each persisted object. If an op is genuinely unreachable, state under *Out of scope* which object and which op, with the reason. |
| **Dependency data lifecycle** | Feature references, snapshots, caches, or otherwise reads data owned by another feature / store / index / service — even when the feature itself has no delete or update action | In scope. Cover: dangling reference (the referenced object is deleted by its owner), drift (the referenced value changes after snapshot), and dependency unavailability (the owning store / service is disabled or unreachable). Or state per case under *Out of scope*. |

**Invalid reasons for omitting any of the above**:

- *"Feature is behind an off-by-default flag."* — A flag hides the feature; it does not stop schema, SO, config, or navigation changes from shipping.
- *"The PR does not narrate this."* — The PR is a starting point, not the scope boundary. Persisted objects reached via inherited platform behaviour are still in scope.
- *"Assumed not needed."* — Assumption without evidence. Apply the Core rule.

---

### Upgrade scenarios

Use `TARGET_VERSION` (detected in Step 2) as the target version.

**Resolve source versions from `elastic/kibana`'s `versions.json`** — the authoritative list of currently-supported release branches, updated as the release train advances. At generation time, fetch the file from:

```
https://raw.githubusercontent.com/elastic/kibana/main/versions.json
```

Fetching from `main` guarantees the values are current regardless of which branch the agent is invoked from. If the remote fetch fails (offline, network error, GitHub unavailable), fall back to reading `<repo-root>/versions.json` from the local checkout. Never hardcode version numbers.

Resolve the two placeholders below from the fetched file:

- `PREVIOUS_MAJOR_LAST_MINOR` — the `version` of the highest-numbered entry with `branchType: "release"` whose major is exactly one less than `TARGET_VERSION`'s major (e.g. `8.19.19` when `TARGET_VERSION` is on the `9.x` line).
- `CURRENT_MAJOR_LAST_MINOR` — the `version` of the highest-numbered entry with `branchType: "release"` whose major equals `TARGET_VERSION`'s major and whose minor is strictly less than `TARGET_VERSION`'s minor (e.g. `9.5.0` when `TARGET_VERSION` is `9.6`).

If both remote and local fetches fail, or if either placeholder has no eligible entry in the file (e.g. `TARGET_VERSION` is the first minor of a new major cycle, so no `CURRENT_MAJOR_LAST_MINOR` exists yet), record the affected placeholder under *Assumptions* with a `⚠️` and ask the user to confirm before publishing — do not drop the scenario.

```gherkin
@upgrade
Scenario: Feature works correctly after upgrading from PREVIOUS_MAJOR_LAST_MINOR to TARGET_VERSION
  Given a Kibana instance running PREVIOUS_MAJOR_LAST_MINOR with existing data relevant to this feature
  When the instance is upgraded to TARGET_VERSION
  Then the feature is accessible and behaves as expected
  And existing data or configuration is preserved without errors

@upgrade
Scenario: Feature works correctly after upgrading from CURRENT_MAJOR_LAST_MINOR to TARGET_VERSION
  Given a Kibana instance running CURRENT_MAJOR_LAST_MINOR with existing data relevant to this feature
  When the instance is upgraded to TARGET_VERSION
  Then the feature is accessible and behaves as expected
  And existing data or configuration is preserved without errors
```

CRUD and dependency-lifecycle scenarios do not have dedicated templates — they are written inline in the feature area they belong to, using the same Gherkin conventions as any other scenario.

---

## Optional section templates

Include each optional section only when the evidence clearly supports it. If it is not clear whether a section applies, ask the user before including — do not include sections speculatively.

| Section | Include if |
|---|---|
| **RBAC** | Issue explicitly mentions roles, permissions, or access control |
| **Multi-space** | Feature involves entities that are space-aware in Kibana — rules, cases, alerts, dashboards, saved objects, actions, or any configuration scoped to a Kibana space |
| **Multi-tenant** | Feature involves data ingestion, index patterns, or configuration in a Serverless or ECH deployment |
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