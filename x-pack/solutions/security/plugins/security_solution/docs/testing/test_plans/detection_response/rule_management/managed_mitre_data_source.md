# Test plan: Managed MITRE Data Source <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

This is a test plan for the Managed MITRE Data Source feature, which provides a structured, query-able data source for MITRE ATT&CK entities (tactics, techniques, and subtechniques) in the Security Solution. The feature stores MITRE data as Saved Objects populated from a bundled artifact at startup, replacing a large hardcoded TypeScript file. A new internal API and React hook expose the data to UI consumers (rule create/edit form, coverage overview) with no visible UX change. A feature flag (`managedMitreSourceEnabled`) gates all new behavior.

Out of scope for this plan: `GET /internal/mitre/search` route scenarios, Fleet out-of-band delivery, ATLAS framework, AI tooling, rule details flyout cutover, semantic search, and removal of the legacy blob.

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
  - [SO population lifecycle](#so-population-lifecycle)
  - [Feature flag behavior](#feature-flag-behavior)
  - [Entities API: filtering and response shape](#entities-api-filtering-and-response-shape)
  - [Entities API: input validation](#entities-api-input-validation)
  - [Server-side data client](#server-side-data-client)
  - [MITRE configuration hook](#mitre-configuration-hook)
  - [Technique picker](#technique-picker)
  - [Coverage overview](#coverage-overview)
  - [Multi-version coexistence](#multi-version-coexistence)
  - [Error handling](#error-handling)

## Useful information

### Tickets

- [Managed MITRE workstream epic](https://github.com/elastic/security-team/issues/9627)
- [Sub-epic](https://github.com/elastic/security-team/issues/17157)

### Terminology

- **Entities API**: `GET /internal/mitre/entities` — the internal API route that returns MITRE entities filtered by framework, version, type, and active status.
- **MITRE entity**: a tactic, technique, or subtechnique stored as a `mitre-attack-entity` Saved Object. All three share a common base schema (`id`, `name`, `description`, `reference`, `framework`, `framework_version`, `revoked`, `deprecated`) with type-specific fields (`position` for tactics, `tactic_ids` for techniques and subtechniques, `technique_id` for subtechniques).
- **Data client** (`MitreAttackDataClient`): server-side read-only client exported from the `mitre_attack` plugin's start contract. Provides `getById()`, `list()`, and `search()` methods over the `mitre-attack-entity` SO type.
- **MITRE hook** (`useMitreConfiguration()`): React Query hook consumed by the technique picker and coverage overview. Abstracts the active data source (legacy blob vs. managed API) from consuming components.
- **Population**: the `bulkCreate` call in the `mitre_attack` plugin's `start()` lifecycle that writes all entities from the bundled artifact into the `.kibana_security_solution` index using deterministic SO IDs of the form `{framework}:{framework_version}:{mitre_id}`.
- **Legacy blob**: `mitre_tactics_techniques.ts`, the existing hardcoded TypeScript file retained as the flag-off fallback.
- **Older/newer version**: when testing multi-version coexistence, scenarios use relative terms rather than pinning specific version strings. The artifact may contain entities from more than one framework version; these coexist without ID collisions because the version is encoded in the SO ID.

## Requirements

### Assumptions

- Unless explicitly stated otherwise, the `managedMitreSourceEnabled` feature flag is **enabled** and MITRE entity Saved Objects have been populated from the bundled artifact.
- Scenarios that test flag-off behavior explicitly state "Given the feature flag is disabled."
- All scenarios assume an Enterprise license unless stated otherwise.
- The user has the necessary access to reach the relevant Security Solution pages.

### Technical requirements

- Population must be idempotent: running on every restart must not duplicate entities (`bulkCreate` uses `overwrite: true`).
- Population must not block or crash Kibana startup on failure; errors must be caught and logged.
- SO IDs must be deterministic (`{framework}:{framework_version}:{mitre_id}`), enabling multiple versions to coexist without ID collisions.
- Reads must return empty results gracefully (no error, no 5xx) when population has not completed.
- Routes must not be registered when the feature flag is off.
- All API query parameters must be bounded: `framework_version` max 32 characters, `types` array max 3 elements.

### Product requirements

User stories:

- User opening the rule create/edit form sees the MITRE technique picker populated with the same set of active tactics and techniques whether the flag is on or off (parity with the legacy path).
- User viewing the coverage overview sees tactics ordered by their `position` field; no hardcoded ordering is consulted.
- A new MITRE version added to the artifact produces correct coverage overview ordering without any code change.
- Revoked and deprecated MITRE entities are excluded from the technique picker and coverage overview by default.
- Server-side consumers (e.g. future AI tooling) can call the data client without knowing the underlying SO structure.

## Scenarios

### SO population lifecycle

#### **Scenario: MITRE entities are populated at plugin startup**

**Automation**: 1 integration test.

```Gherkin
Given the mitre_attack plugin has completed its start() lifecycle
Then mitre-attack-entity Saved Objects should exist in the .kibana_security_solution index
And each Saved Object should have a deterministic ID of the form {framework}:{framework_version}:{mitre_id}
And the total count should match the number of entities in the bundled artifact
```

#### **Scenario: Population is idempotent across Kibana restarts**

**Automation**: 1 integration test.

```Gherkin
Given mitre-attack-entity Saved Objects have been populated from a previous startup
When Kibana restarts and the plugin start() lifecycle completes again
Then the total count of mitre-attack-entity Saved Objects should remain the same
And no duplicate Saved Objects should exist for any entity
```

#### **Scenario: SO IDs encode the framework version, allowing multiple versions to coexist**

**Automation**: 1 integration test.

```Gherkin
Given the bundled artifact contains entities from more than one framework version
When the plugin start() lifecycle completes
Then Saved Objects from the older and newer framework versions should both be present
And no two entities with the same mitre_id but different framework_versions should share an ID
```

#### **Scenario: Reads return empty results gracefully before population completes**

**Automation**: 1 unit test (mock SO client to return empty).

```Gherkin
Given population has not yet completed
When the data client is queried for entities
Then it should return an empty array
And no error should be thrown
```

#### **Scenario: A population failure is logged but does not crash Kibana startup**

**Automation**: 1 unit test (mock `bulkCreate` to throw).

```Gherkin
Given bulkCreate throws an error during plugin startup
When the plugin start() lifecycle executes
Then the error should be caught and logged
And start() should resolve without rethrowing
And Kibana startup should complete successfully
```

### Feature flag behavior

#### **Scenario: When the flag is off, no routes are registered and no population runs**

**Automation**: 1 integration test.

```Gherkin
Given the feature flag is disabled
When Kibana starts
Then a request to the entities API should return 404
And no mitre-attack-entity Saved Objects should be created
And the legacy blob import path should remain in use with no change in behavior
```

#### **Scenario: When the flag is on, routes are registered and population runs**

**Automation**: 1 integration test.

```Gherkin
Given the feature flag is enabled
When Kibana starts
Then a request to the entities API should return 200 with populated entities
And mitre-attack-entity Saved Objects should exist in the index
```

#### **Scenario: Toggling the flag takes effect only after a Kibana restart**

**Automation**: 1 unit test / noted constraint.

```Gherkin
Given Kibana has started with the feature flag enabled
When the flag value is changed at runtime without restarting Kibana
Then the entities API route should remain registered for the lifetime of that process
And the flag should not be re-evaluated until the next startup
```

### Entities API: filtering and response shape

#### **Scenario: All entity types are returned when `types` is omitted**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called without a types parameter
Then the response should contain entities of type "tactic", "technique", and "subtechnique"
And all entities should belong to the "enterprise" framework
```

#### **Scenario: Only the requested entity type is returned**

**Automation**: 1 integration test per type.

```Gherkin
When the entities API is called with types=<type>
Then every entity in the response should have type <type>
And no entity of any other type should appear

Examples:
  | <type>       |
  | tactic       |
  | technique    |
  | subtechnique |
```

#### **Scenario: A subset of types can be requested together**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=technique&types=subtechnique
Then the response should contain techniques and subtechniques
And no tactic should appear in the response
```

#### **Scenario: `types` accepts a single string value (not array) and handles it correctly**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types as a single string value "technique"
Then the response should behave identically to passing types as a single-element array
And every returned entity should have type "technique"
```

#### **Scenario: `framework` defaults to "enterprise" when omitted**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called without a framework parameter
Then the response framework field should equal "enterprise"
```

#### **Scenario: `framework_version` omitted resolves to the latest version and is reflected in the response**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called without a framework_version parameter
Then the response framework_version field should be a non-empty string matching the latest version in the index
And the returned entities should belong to that latest version
```

#### **Scenario: `framework_version` specified explicitly returns entities from that version**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for an older framework version and a newer framework version
When the entities API is called with framework_version set to the older version
Then the response framework_version field should match the older version
And all returned entities should belong to the older version
```

#### **Scenario: Revoked and deprecated entities are excluded by default**

**Automation**: 1 integration test.

```Gherkin
Given the index contains entities with revoked=true and deprecated=true alongside active entities
When the entities API is called without an include_inactive parameter
Then no entity in the response should have revoked equal to true
And no entity in the response should have deprecated equal to true
```

#### **Scenario: `include_inactive=true` includes revoked and deprecated entities**

**Automation**: 1 integration test.

```Gherkin
Given the index contains entities with revoked=true and deprecated=true
When the entities API is called with include_inactive=true
Then the response should contain at least one entity with revoked equal to true
And the response should contain at least one entity with deprecated equal to true
```

#### **Scenario: Tactic entities have a numeric `position` field**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=tactic
Then every tactic in the response should have a position field
And every position field should be a non-negative integer
```

#### **Scenario: Technique entities have a non-empty `tactic_ids` array**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=technique
Then every technique in the response should have a non-empty tactic_ids array
```

#### **Scenario: A multi-tactic technique appears once with all its tactic IDs**

**Automation**: 1 integration test.

```Gherkin
Given the index contains a technique mapped to more than one tactic
When the entities API is called with types=technique
Then the multi-tactic technique should appear exactly once in the response
And its tactic_ids field should contain all tactic IDs it is mapped to
```

#### **Scenario: Subtechnique entities have both `tactic_ids` and `technique_id`**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=subtechnique
Then every subtechnique in the response should have a non-empty tactic_ids array
And every subtechnique should have a non-empty technique_id string
```

### Entities API: input validation

#### **Scenario: An unsupported `framework` value returns 400**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a framework value other than "enterprise"
Then the response status should be 400
And the response body should describe a validation error for the framework parameter
```

#### **Scenario: An invalid `types` value returns 400**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a types value that is not "tactic", "technique", or "subtechnique"
Then the response status should be 400
And the response body should describe a validation error for the types parameter
```

#### **Scenario: A `framework_version` string exceeding 32 characters returns 400**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a framework_version string of 33 or more characters
Then the response status should be 400
And the response body should describe a validation error for the framework_version parameter
```

#### **Scenario: A `types` array exceeding 3 elements returns 400**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a types array containing more than 3 elements
Then the response status should be 400
And the response body should describe a validation error for the types parameter
```

### Server-side data client

#### **Scenario: `getById()` returns the correct entity for a known ID**

**Automation**: 2 unit tests (mock SO client) — one for a technique, one for a tactic.

```Gherkin
When getById("<id>") is called
Then the returned entity should have id "<id>"
And the entity should include all fields appropriate for its type

Examples:
  | <id>   | expected type |
  | T1003  | technique     |
  | TA0001 | tactic        |
```

#### **Scenario: `getById()` returns `undefined` for an unknown ID**

**Automation**: 1 unit test.

```Gherkin
When getById() is called with an ID that does not exist in the index
Then the returned value should be undefined
And no error should be thrown
```

#### **Scenario: `getById()` resolves to the newest version when `frameworkVersion` is omitted**

**Automation**: 1 unit test (mock SO client with two versions seeded).

```Gherkin
Given Saved Objects contain entries for the same technique ID at an older and a newer framework version
When getById() is called for that technique without specifying frameworkVersion
Then the entity from the newer version should be returned
```

#### **Scenario: `getById()` returns the specified version when `frameworkVersion` is provided**

**Automation**: 1 unit test (mock SO client with two versions seeded).

```Gherkin
Given Saved Objects contain entries for the same technique ID at an older and a newer framework version
When getById() is called with frameworkVersion set to the older version
Then the entity from the older version should be returned
```

#### **Scenario: `list()` returns all active entities with default parameters**

**Automation**: 1 unit test.

```Gherkin
When list() is called with no parameters
Then the result should include entities of type "tactic", "technique", and "subtechnique"
And no revoked or deprecated entities should be present
```

#### **Scenario: `list()` filters by `types`**

**Automation**: 1 unit test.

```Gherkin
When list({ types: ["tactic"] }) is called
Then only tactic entities should be returned
And no technique or subtechnique should appear in the result
```

#### **Scenario: `list()` excludes revoked and deprecated entities by default**

**Automation**: 1 unit test.

```Gherkin
Given the index contains active, revoked, and deprecated entities
When list() is called without setting includeInactive
Then every returned entity should have revoked equal to false and deprecated equal to false
```

#### **Scenario: `list()` includes revoked and deprecated entities when `includeInactive` is true**

**Automation**: 1 unit test.

```Gherkin
Given the index contains active, revoked, and deprecated entities
When list({ includeInactive: true }) is called
Then the result should include at least one entity with revoked equal to true
And at least one entity with deprecated equal to true
```

#### **Scenario: `list()` returns an empty array when the index is empty**

**Automation**: 1 unit test.

```Gherkin
Given the index is empty because population has not yet completed
When list() is called
Then it should return an empty array with no error thrown
```

#### **Scenario: `search()` returns relevance-scored results ordered by score**

**Automation**: 1 unit test (mock ES client).

```Gherkin
When search({ query: "credential dumping" }) is called
Then the result should be an array of hits each containing an entity and a numeric score
And hits should be ordered by score descending
```

#### **Scenario: `search()` respects the `size` parameter**

**Automation**: 1 unit test.

```Gherkin
Given the index contains more entities matching the query than the requested size
When search({ query: "execution", size: 5 }) is called
Then at most 5 hits should be returned
```

#### **Scenario: `search()` in keyword mode uses BM25 multi-match with field boosting**

**Automation**: 1 unit test (assert the ES query shape).

```Gherkin
When search({ query: "T1003", mode: "keyword" }) is called
Then the underlying query should be a BM25 multi-match across name.text (boost 3), description (boost 1), and id (boost 2)
```

#### **Scenario: `search()` filters by `types`**

**Automation**: 1 unit test.

```Gherkin
When search({ query: "lateral movement", types: ["technique"] }) is called
Then only hits whose entity type is "technique" should be returned
```

### MITRE configuration hook

#### **Scenario: When the flag is off, the hook returns legacy blob data without making an API request**

**Automation**: 1 React unit test.

```Gherkin
Given the feature flag is disabled
When useMitreConfiguration() is called
Then the hook should return tactics, techniques, and subtechniques from the legacy blob
And no HTTP request to the entities API should be made
```

#### **Scenario: When the flag is on, the hook fetches from the entities API**

**Automation**: 1 React unit test.

```Gherkin
When useMitreConfiguration() is called
Then the hook should issue one GET request to the entities API
And return the tactics, techniques, and subtechniques from the API response
```

#### **Scenario: The hook exposes a loading state while the fetch is in flight**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API request has not yet resolved
When useMitreConfiguration() is called
Then the hook should expose a loading indicator
And downstream components should render a loading skeleton
```

#### **Scenario: An empty API response is treated as a loading/pending state, not an error**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API responds with an empty entities array because population is not yet complete
When useMitreConfiguration() resolves
Then the hook should remain in a loading/pending state
And no error should be surfaced to the consuming component
```

#### **Scenario: The hook partitions resolved entities by type for consuming components**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API returns a mixed payload of tactics, techniques, and subtechniques
When useMitreConfiguration() resolves
Then the hook should expose a tactics array, a techniques array, and a subtechniques array
And no entity should appear in more than one partition
```

#### **Scenario: Consuming components receive the same data shape from both data sources**

**Automation**: 2 React unit tests — one with flag off, one with flag on.

```Gherkin
When useMitreConfiguration() resolves with the flag disabled and data from the legacy blob
And separately when it resolves with the flag enabled and data from the API
Then the shape of the tactics, techniques, and subtechniques arrays should be identical in both cases
And consuming components should require no conditional branching to differentiate the two sources
```

### Technique picker

#### **Scenario: User can open the technique picker and see all active tactics and techniques**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create form
When user opens the MITRE ATT&CK technique picker
Then the picker should display all active tactics from the managed data source
And each tactic should list its associated techniques and subtechniques
```

#### **Scenario: Technique picker data matches the legacy blob for the same MITRE version**

**Automation**: 1 Cypress comparison test.

```Gherkin
Given the managed MITRE data reflects the same version as the legacy blob
When the technique picker is rendered with the flag disabled
Then a set of active tactics and techniques is recorded
When the technique picker is rendered with the flag enabled
Then the same set of active tactics and techniques should appear
And no revoked or deprecated entities should appear in either set
```

#### **Scenario: A multi-tactic technique appears under each of its associated tactics**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create form
And the managed MITRE data contains a technique associated with more than one tactic
When user opens the MITRE ATT&CK technique picker and expands each applicable tactic
Then the technique should appear as a selectable option under every tactic it belongs to
```

#### **Scenario: The picker shows a loading skeleton while data is loading**

**Automation**: 1 React unit test.

```Gherkin
Given useMitreConfiguration() is in the loading state
When the technique picker renders
Then a loading skeleton or spinner should appear in place of the tactic and technique list
And the rest of the rule create form should remain interactive
```

#### **Scenario: User can select a tactic and technique and save the rule**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given a user is on the rule create form
When user opens the MITRE ATT&CK technique picker and selects a tactic and a technique
And user completes the required fields and saves the rule
Then the rule should be saved successfully
And the saved rule's threat field should contain the selected tactic and technique entries
```

### Coverage overview

#### **Scenario: Tactic columns are ordered by the `position` field from the managed data source**

**Automation**: 1 Cypress e2e test + integration test for the graph builder function.

```Gherkin
When the coverage overview page loads
Then tactic columns should be rendered left to right in ascending order of each tactic's position field
And the hardcoded tacticOrder array should not be consulted
```

#### **Scenario: Tactic column order matches the legacy hardcoded order for the same MITRE version**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given the managed MITRE data reflects the same version as the legacy blob
When the coverage overview is loaded with the flag disabled
Then the tactic column order is recorded
When the coverage overview is loaded with the flag enabled
Then the tactic column order should be identical to the recorded order
```

#### **Scenario: Techniques appear under their correct tactic columns**

**Automation**: 1 Cypress e2e test + unit test for the graph builder function.

```Gherkin
When the coverage overview page loads
Then each technique cell should be placed in the column of a tactic whose ID appears in that technique's tactic_ids
And no technique should appear in a column whose ID is absent from its tactic_ids
```

#### **Scenario: A multi-tactic technique appears under all applicable tactic columns**

**Automation**: 1 Cypress e2e test or unit test for graph builder.

```Gherkin
Given the managed MITRE data contains a technique whose tactic_ids lists more than one tactic
When the coverage overview page loads
Then the technique should appear under every tactic column listed in its tactic_ids
```

#### **Scenario: The coverage overview shows a loading state while data loads**

**Automation**: 1 React unit test.

```Gherkin
Given useMitreConfiguration() is in the loading state
When the coverage overview renders
Then a loading indicator should appear in place of the matrix
And the page should not render an empty or broken grid
```

#### **Scenario: A new MITRE version with reordered tactics renders in the correct position order without code changes**

**Automation**: 1 integration test (inject mock entities with custom positions, assert column order).

```Gherkin
Given the managed MITRE data is updated to a version that adds a tactic and reorders existing ones via position fields
When the build_coverage_overview_mitre_graph function is called with the updated entities
Then the resulting columns should follow the order defined by each tactic's position field
And the added tactic should appear in its correct position
```

#### **Scenario: User can view the coverage overview with the flag off (legacy blob path)**

**Automation**: 1 Cypress e2e test.

```Gherkin
Given the feature flag is disabled
When the coverage overview page loads
Then tactic columns should be rendered in the order defined by the legacy hardcoded tacticOrder array
And each technique cell should appear under its correct tactic column
And the page should render without errors
```

### Multi-version coexistence

#### **Scenario: Older and newer MITRE versions coexist as distinct Saved Objects**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for both an older and a newer framework version
When the Saved Objects index is queried
Then Saved Objects for both versions should be present
And each ID should encode its framework version
And there should be no ID collisions between versions
```

#### **Scenario: The entities API returns the newest version when `framework_version` is omitted**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for both an older and a newer framework version
When the entities API is called without a framework_version parameter
Then the returned entities should belong to the newer framework version only
```

#### **Scenario: The entities API returns the older version when specified explicitly**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for both an older and a newer framework version
When the entities API is called with framework_version set to the older version
Then the returned entities should belong to the older version only
```

#### **Scenario: Each version has an independent full set of entities**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for both an older and a newer framework version
When the entities API is called for each version separately
Then each response should contain a full population for that version
And the entity counts for each version should be independent of each other
```

#### **Scenario: A technique present in both versions is returned with version-specific data**

**Automation**: 1 integration test.

```Gherkin
Given the same technique ID exists in both the older and newer framework version
When the entities API is called once for the older version and once for the newer version
Then each response should contain that technique with the metadata for the respective version
And the two entities should share the same id but differ in their version-specific fields
```

### Error handling

#### **Scenario: The entities API returns 404 when the feature flag is off**

**Automation**: 1 integration test.

```Gherkin
Given the feature flag is disabled
When the entities API is called
Then the response status should be 404
```

#### **Scenario: The entities API returns 200 with an empty entities array when population has not completed**

**Automation**: 1 integration test.

```Gherkin
Given population has not yet completed and the index is empty
When the entities API is called
Then the response status should be 200
And the entities array should be empty
```

#### **Scenario: The entities API returns 200 with an empty entities array for an unknown `framework_version`**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a framework_version value that was never populated
Then the response status should be 200
And the entities array should be empty
```

#### **Scenario: A population failure results in graceful degradation — API returns empty, not 5xx**

**Automation**: 1 integration test.

```Gherkin
Given bulkCreate threw an error during plugin startup and Kibana completed startup normally
When the entities API is called
Then the response status should be 200
And the entities array should be empty
And no 5xx error should be returned
```
