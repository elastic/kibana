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
    - [**Scenario: MITRE entities are populated at plugin startup**](#scenario-mitre-entities-are-populated-at-plugin-startup)
    - [**Scenario: Population is idempotent across Kibana restarts**](#scenario-population-is-idempotent-across-kibana-restarts)
    - [**Scenario: SO IDs encode the framework version, allowing multiple versions to coexist**](#scenario-so-ids-encode-the-framework-version-allowing-multiple-versions-to-coexist)
    - [**Scenario: Reads return an empty collection gracefully before population completes**](#scenario-reads-return-an-empty-collection-gracefully-before-population-completes)
    - [**Scenario: A population failure is logged but does not crash Kibana startup**](#scenario-a-population-failure-is-logged-but-does-not-crash-kibana-startup)
  - [Feature flag behavior](#feature-flag-behavior)
    - [**Scenario: When the flag is off, no routes are registered and no population runs**](#scenario-when-the-flag-is-off-no-routes-are-registered-and-no-population-runs)
    - [**Scenario: When the flag is on, routes are registered and population runs**](#scenario-when-the-flag-is-on-routes-are-registered-and-population-runs)
    - [**Scenario: Toggling the flag takes effect only after a Kibana restart**](#scenario-toggling-the-flag-takes-effect-only-after-a-kibana-restart)
  - [Entities API: filtering and response shape](#entities-api-filtering-and-response-shape)
    - [**Scenario: Response contains separate buckets for tactics, techniques, and subtechniques**](#scenario-response-contains-separate-buckets-for-tactics-techniques-and-subtechniques)
    - [**Scenario: `types` filters which buckets are populated**](#scenario-types-filters-which-buckets-are-populated)
    - [**Scenario: Multiple types can be requested together**](#scenario-multiple-types-can-be-requested-together)
    - [**Scenario: `types` accepts a single string value and handles it correctly**](#scenario-types-accepts-a-single-string-value-and-handles-it-correctly)
    - [**Scenario: `framework` defaults to "enterprise" when omitted**](#scenario-framework-defaults-to-enterprise-when-omitted)
    - [**Scenario: `framework_version` omitted resolves to the latest version and is reflected in the response**](#scenario-framework_version-omitted-resolves-to-the-latest-version-and-is-reflected-in-the-response)
    - [**Scenario: `framework_version` specified explicitly returns entities from that version**](#scenario-framework_version-specified-explicitly-returns-entities-from-that-version)
    - [**Scenario: `status` defaults to "active", excluding revoked and deprecated entities**](#scenario-status-defaults-to-active-excluding-revoked-and-deprecated-entities)
    - [**Scenario: `status=all` includes revoked and deprecated entities**](#scenario-statusall-includes-revoked-and-deprecated-entities)
    - [**Scenario: Tactic summaries include a numeric `position` field**](#scenario-tactic-summaries-include-a-numeric-position-field)
    - [**Scenario: Technique summaries include a non-empty `tactic_ids` array**](#scenario-technique-summaries-include-a-non-empty-tactic_ids-array)
    - [**Scenario: A multi-tactic technique appears once in the techniques bucket with all its tactic IDs**](#scenario-a-multi-tactic-technique-appears-once-in-the-techniques-bucket-with-all-its-tactic-ids)
    - [**Scenario: Subtechnique summaries include both `tactic_ids` and `technique_id`**](#scenario-subtechnique-summaries-include-both-tactic_ids-and-technique_id)
  - [Entities API: input validation](#entities-api-input-validation)
    - [**Scenario: Invalid query parameters return 400**](#scenario-invalid-query-parameters-return-400)
  - [Server-side data client](#server-side-data-client)
    - [**Scenario: `getById()` returns the correct entity for a known ID**](#scenario-getbyid-returns-the-correct-entity-for-a-known-id)
    - [**Scenario: `getById()` returns `undefined` for an unknown ID**](#scenario-getbyid-returns-undefined-for-an-unknown-id)
    - [**Scenario: `getById()` resolves to the newest version when `frameworkVersion` is omitted**](#scenario-getbyid-resolves-to-the-newest-version-when-frameworkversion-is-omitted)
    - [**Scenario: `getById()` returns the specified version when `frameworkVersion` is provided**](#scenario-getbyid-returns-the-specified-version-when-frameworkversion-is-provided)
    - [**Scenario: `list()` returns a collection with populated typed buckets and default parameters**](#scenario-list-returns-a-collection-with-populated-typed-buckets-and-default-parameters)
    - [**Scenario: `list()` exposes a `byId` map for direct entity lookup**](#scenario-list-exposes-a-byid-map-for-direct-entity-lookup)
    - [**Scenario: `list()` exposes a `subtechniquesByTechniqueId` map**](#scenario-list-exposes-a-subtechniquesbytechniqueid-map)
    - [**Scenario: `list()` filters by `types`**](#scenario-list-filters-by-types)
    - [**Scenario: `list()` excludes revoked and deprecated entities by default**](#scenario-list-excludes-revoked-and-deprecated-entities-by-default)
    - [**Scenario: `list()` includes revoked and deprecated entities when `status` is "all"**](#scenario-list-includes-revoked-and-deprecated-entities-when-status-is-all)
    - [**Scenario: `list()` returns an empty collection when the index is empty**](#scenario-list-returns-an-empty-collection-when-the-index-is-empty)
    - [**Scenario: `search()` returns relevance-scored results ordered by score**](#scenario-search-returns-relevance-scored-results-ordered-by-score)
    - [**Scenario: `search()` respects the `size` parameter**](#scenario-search-respects-the-size-parameter)
    - [**Scenario: `search()` in keyword mode uses BM25 multi-match with field boosting**](#scenario-search-in-keyword-mode-uses-bm25-multi-match-with-field-boosting)
    - [**Scenario: `search()` filters by `types`**](#scenario-search-filters-by-types)
  - [MITRE configuration hook](#mitre-configuration-hook)
    - [**Scenario: When the flag is off, the hook returns legacy blob data without making an API request**](#scenario-when-the-flag-is-off-the-hook-returns-legacy-blob-data-without-making-an-api-request)
    - [**Scenario: When the flag is on, the hook fetches from the entities API**](#scenario-when-the-flag-is-on-the-hook-fetches-from-the-entities-api)
    - [**Scenario: The hook exposes a loading state while the fetch is in flight**](#scenario-the-hook-exposes-a-loading-state-while-the-fetch-is-in-flight)
    - [**Scenario: An empty API response is treated as a loading/pending state, not an error**](#scenario-an-empty-api-response-is-treated-as-a-loadingpending-state-not-an-error)
    - [**Scenario: The hook exposes typed buckets, a `byId` map, and a `subtechniquesByTechniqueId` map**](#scenario-the-hook-exposes-typed-buckets-a-byid-map-and-a-subtechniquesbytechniqueid-map)
    - [**Scenario: Consuming components receive the same data shape from both data sources**](#scenario-consuming-components-receive-the-same-data-shape-from-both-data-sources)
  - [Technique picker](#technique-picker)
    - [**Scenario: User can open the technique picker and see all active tactics and techniques**](#scenario-user-can-open-the-technique-picker-and-see-all-active-tactics-and-techniques)
    - [**Scenario: Technique picker data matches the legacy blob for the same MITRE version**](#scenario-technique-picker-data-matches-the-legacy-blob-for-the-same-mitre-version)
    - [**Scenario: A multi-tactic technique appears under each of its associated tactics**](#scenario-a-multi-tactic-technique-appears-under-each-of-its-associated-tactics)
    - [**Scenario: The picker shows a loading skeleton while data is loading**](#scenario-the-picker-shows-a-loading-skeleton-while-data-is-loading)
    - [**Scenario: User can select a tactic and technique and save the rule**](#scenario-user-can-select-a-tactic-and-technique-and-save-the-rule)
  - [Coverage overview](#coverage-overview)
    - [**Scenario: Tactic columns are ordered by the `position` field from the managed data source**](#scenario-tactic-columns-are-ordered-by-the-position-field-from-the-managed-data-source)
    - [**Scenario: Tactic column order matches the legacy hardcoded order for the same MITRE version**](#scenario-tactic-column-order-matches-the-legacy-hardcoded-order-for-the-same-mitre-version)
    - [**Scenario: Techniques appear under their correct tactic columns**](#scenario-techniques-appear-under-their-correct-tactic-columns)
    - [**Scenario: A multi-tactic technique appears under all applicable tactic columns**](#scenario-a-multi-tactic-technique-appears-under-all-applicable-tactic-columns)
    - [**Scenario: The coverage overview shows a loading state while data loads**](#scenario-the-coverage-overview-shows-a-loading-state-while-data-loads)
    - [**Scenario: A new MITRE version with reordered tactics renders in the correct position order without code changes**](#scenario-a-new-mitre-version-with-reordered-tactics-renders-in-the-correct-position-order-without-code-changes)
    - [**Scenario: User can view the coverage overview with the flag off (legacy blob path)**](#scenario-user-can-view-the-coverage-overview-with-the-flag-off-legacy-blob-path)
  - [Multi-version coexistence](#multi-version-coexistence)
    - [**Scenario: Older and newer MITRE versions coexist as distinct Saved Objects**](#scenario-older-and-newer-mitre-versions-coexist-as-distinct-saved-objects)
    - [**Scenario: The entities API returns the newest version when `framework_version` is omitted**](#scenario-the-entities-api-returns-the-newest-version-when-framework_version-is-omitted)
    - [**Scenario: The entities API returns the older version when specified explicitly**](#scenario-the-entities-api-returns-the-older-version-when-specified-explicitly)
    - [**Scenario: Each version has an independent full set of entities**](#scenario-each-version-has-an-independent-full-set-of-entities)
    - [**Scenario: A technique present in both versions is returned with version-specific data**](#scenario-a-technique-present-in-both-versions-is-returned-with-version-specific-data)
  - [Error handling](#error-handling)
    - [**Scenario: The entities API returns 404 when the feature flag is off**](#scenario-the-entities-api-returns-404-when-the-feature-flag-is-off)
    - [**Scenario: The entities API returns 200 with empty buckets when population has not completed**](#scenario-the-entities-api-returns-200-with-empty-buckets-when-population-has-not-completed)
    - [**Scenario: The entities API returns 200 with empty buckets for an unknown `framework_version`**](#scenario-the-entities-api-returns-200-with-empty-buckets-for-an-unknown-framework_version)
    - [**Scenario: A population failure results in graceful degradation — API returns empty buckets, not 5xx**](#scenario-a-population-failure-results-in-graceful-degradation--api-returns-empty-buckets-not-5xx)

## Useful information

### Tickets

- [Managed MITRE workstream epic](https://github.com/elastic/security-team/issues/9627)
- [Sub-epic](https://github.com/elastic/security-team/issues/17157)

### Terminology

- **Entities API**: `GET /internal/mitre/entities` — the internal API route that returns MITRE entities filtered by framework, version, type, and status.
- **MITRE entity**: a tactic, technique, or subtechnique stored as a `mitre-attack-entity` Saved Object. All three share a common base schema (`id`, `name`, `description`, `reference`, `framework`, `framework_version`, `revoked`, `deprecated`) with type-specific fields (`position` for tactics; `tactic_ids` for techniques and subtechniques; `technique_id` for subtechniques).
- **Entity summary**: the API response strips `description` from each entity. `MitreTacticSummary`, `MitreTechniqueSummary`, and `MitreSubtechniqueSummary` are identical to their full counterparts except `description` is omitted.
- **Entity collection** (`MitreEntityCollection`): the structured return type of `list()`. Contains typed buckets (`tactics`, `techniques`, `subtechniques`), a `byId` lookup map keyed by MITRE ID, a `subtechniquesByTechniqueId` map grouping subtechniques under their parent technique ID, plus `framework` and `frameworkVersion`.
- **Summary collection** (`MitreEntitySummaryCollection`): the same shape as the entity collection but with summary types (no `description`). This is what the MITRE hook exposes to UI components.
- **Data client** (`MitreAttackDataClient`): server-side read-only client exported from the `mitre_attack` plugin's start contract. Provides `getById()`, `list()`, and `search()` methods over the `mitre-attack-entity` SO type.
- **MITRE hook** (`useMitreConfiguration()`): React Query hook consumed by the technique picker and coverage overview. Returns a `MitreEntitySummaryCollection`. Abstracts the active data source (legacy blob vs. managed API) from consuming components.
- **`status` parameter**: controls whether inactive entities are included. `'active'` (default) returns only entities where both `revoked` and `deprecated` are false. `'all'` includes all entities regardless of revocation or deprecation status.
- **Population**: the `bulkCreate` call in the `mitre_attack` plugin's `start()` lifecycle that writes all entities from the bundled artifact into the `.kibana_security_solution` index using deterministic SO IDs of the form `{framework}:{framework_version}:{mitre_id}`.
- **Legacy blob**: `mitre_tactics_techniques.ts`, the existing hardcoded TypeScript file retained as the flag-off fallback.

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

#### **Scenario: Reads return an empty collection gracefully before population completes**

**Automation**: 1 unit test (mock SO client to return empty).

```Gherkin
Given population has not yet completed
When the data client is queried for entities
Then it should return an empty MitreEntityCollection with empty tactics, techniques, and subtechniques buckets
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

The entities API returns three typed buckets — `tactics`, `techniques`, and `subtechniques` — rather than a flat array. Entities in the response are summary types: they include all fields except `description`.

#### **Scenario: Response contains separate buckets for tactics, techniques, and subtechniques**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called without a types parameter
Then the response should contain a tactics array, a techniques array, and a subtechniques array
And entities should not include a description field
And all entities should belong to the "enterprise" framework
```

#### **Scenario: `types` filters which buckets are populated**

**Automation**: 1 integration test per type.

```Gherkin
When the entities API is called with types=<type>
Then the <type>s bucket should be populated
And the other two buckets should be empty

Examples:
  | <type>       |
  | tactic       |
  | technique    |
  | subtechnique |
```

#### **Scenario: Multiple types can be requested together**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=technique&types=subtechnique
Then the techniques and subtechniques buckets should be populated
And the tactics bucket should be empty
```

#### **Scenario: `types` accepts a single string value and handles it correctly**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types as a single string value "technique"
Then the response should be identical to passing types as a single-element array
And only the techniques bucket should be populated
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
And all entities in all buckets should belong to the older version
```

#### **Scenario: `status` defaults to "active", excluding revoked and deprecated entities**

**Automation**: 1 integration test.

```Gherkin
Given the index contains entities with revoked=true and deprecated=true alongside active entities
When the entities API is called without a status parameter
Then no entity in any bucket should have revoked equal to true
And no entity in any bucket should have deprecated equal to true
```

#### **Scenario: `status=all` includes revoked and deprecated entities**

**Automation**: 1 integration test.

```Gherkin
Given the index contains entities with revoked=true and deprecated=true
When the entities API is called with status=all
Then at least one entity with revoked equal to true should appear across the buckets
And at least one entity with deprecated equal to true should appear across the buckets
```

#### **Scenario: Tactic summaries include a numeric `position` field**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=tactic
Then every entry in the tactics bucket should have a position field
And every position field should be a non-negative integer
```

#### **Scenario: Technique summaries include a non-empty `tactic_ids` array**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=technique
Then every entry in the techniques bucket should have a non-empty tactic_ids array
```

#### **Scenario: A multi-tactic technique appears once in the techniques bucket with all its tactic IDs**

**Automation**: 1 integration test.

```Gherkin
Given the index contains a technique mapped to more than one tactic
When the entities API is called with types=technique
Then the multi-tactic technique should appear exactly once in the techniques bucket
And its tactic_ids field should contain all tactic IDs it is mapped to
```

#### **Scenario: Subtechnique summaries include both `tactic_ids` and `technique_id`**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with types=subtechnique
Then every entry in the subtechniques bucket should have a non-empty tactic_ids array
And every entry should have a non-empty technique_id string
```

### Entities API: input validation

#### **Scenario: Invalid query parameters return 400**

**Automation**: 1 integration test per row.

```Gherkin
When the entities API is called with an invalid <parameter> value (<reason>)
Then the response status should be 400
And the response body should describe a validation error for the <parameter> parameter
```

**Examples:**

| `<parameter>`       | `<reason>`                                                    |
| ------------------- | ------------------------------------------------------------- |
| `framework`         | value is not "enterprise"                                     |
| `types`             | contains a value not in tactic / technique / subtechnique     |
| `types`             | array contains more than 3 elements                           |
| `framework_version` | string exceeds 32 characters                                  |
| `status`            | value is not "active" or "all"                                |

### Server-side data client

`list()` returns a `MitreEntityCollection` — a structured object with typed buckets, lookup maps, and version metadata — rather than a flat array. `getById()` and `search()` return full entities including `description`.

#### **Scenario: `getById()` returns the correct entity for a known ID**

**Automation**: 2 unit tests (mock SO client) — one for a technique, one for a tactic.

```Gherkin
When getById("<id>") is called
Then the returned entity should have id "<id>"
And the entity should include all fields appropriate for its type, including description

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

#### **Scenario: `list()` returns a collection with populated typed buckets and default parameters**

**Automation**: 1 unit test.

```Gherkin
When list() is called with no parameters
Then the result should be a MitreEntityCollection
And the tactics, techniques, and subtechniques buckets should all be populated
And no revoked or deprecated entities should be present in any bucket
And the framework and frameworkVersion fields should be set
```

#### **Scenario: `list()` exposes a `byId` map for direct entity lookup**

**Automation**: 1 unit test.

```Gherkin
When list() is called
Then the result's byId map should contain an entry for each returned entity keyed by its MITRE ID
And looking up a known MITRE ID in byId should return the corresponding entity
```

#### **Scenario: `list()` exposes a `subtechniquesByTechniqueId` map**

**Automation**: 1 unit test.

```Gherkin
Given the index contains subtechniques belonging to a parent technique
When list() is called
Then the result's subtechniquesByTechniqueId map should group subtechniques under their parent technique's ID
And every subtechnique in the map should have technique_id matching its key
```

#### **Scenario: `list()` filters by `types`**

**Automation**: 1 unit test per type.

```Gherkin
When list({ types: ["<type>"] }) is called
Then only the <type>s bucket should be populated
And the other two buckets should be empty
```

**Examples:**

`<type>` = tactic | technique | subtechnique

#### **Scenario: `list()` excludes revoked and deprecated entities by default**

**Automation**: 1 unit test.

```Gherkin
Given the index contains active, revoked, and deprecated entities
When list() is called without setting status
Then every entity across all buckets should have revoked equal to false and deprecated equal to false
```

#### **Scenario: `list()` includes revoked and deprecated entities when `status` is "all"**

**Automation**: 1 unit test.

```Gherkin
Given the index contains active, revoked, and deprecated entities
When list({ status: 'all' }) is called
Then at least one entity with revoked equal to true should appear across the buckets
And at least one entity with deprecated equal to true should appear
```

#### **Scenario: `list()` returns an empty collection when the index is empty**

**Automation**: 1 unit test.

```Gherkin
Given the index is empty because population has not yet completed
When list() is called
Then it should return a MitreEntityCollection with empty tactics, techniques, and subtechniques buckets
And no error should be thrown
```

#### **Scenario: `search()` returns relevance-scored results ordered by score**

**Automation**: 1 unit test (mock ES client).

```Gherkin
When search({ query: "credential dumping" }) is called
Then the result should be an array of hits each containing a full entity (with description) and a numeric score
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

**Automation**: 1 unit test per type.

```Gherkin
When search({ query: "lateral movement", types: ["<type>"] }) is called
Then only hits whose entity type is "<type>" should be returned
```

**Examples:**

`<type>` = tactic | technique | subtechnique

### MITRE configuration hook

The hook returns a `MitreEntitySummaryCollection` — the same shape as `MitreEntityCollection` but with summary entity types that omit `description`.

#### **Scenario: When the flag is off, the hook returns legacy blob data without making an API request**

**Automation**: 1 React unit test.

```Gherkin
Given the feature flag is disabled
When useMitreConfiguration() is called
Then the hook should return a collection sourced from the legacy blob
And no HTTP request to the entities API should be made
```

#### **Scenario: When the flag is on, the hook fetches from the entities API**

**Automation**: 1 React unit test.

```Gherkin
When useMitreConfiguration() is called
Then the hook should issue one GET request to the entities API
And return a MitreEntitySummaryCollection populated from the API response
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
Given the entities API responds with empty tactics, techniques, and subtechniques buckets because population is not yet complete
When useMitreConfiguration() resolves
Then the hook should remain in a loading/pending state
And no error should be surfaced to the consuming component
```

#### **Scenario: The hook exposes typed buckets, a `byId` map, and a `subtechniquesByTechniqueId` map**

**Automation**: 1 React unit test.

```Gherkin
Given the entities API returns a full payload
When useMitreConfiguration() resolves
Then the hook should expose a tactics array, a techniques array, and a subtechniques array
And a byId map keyed by MITRE ID covering all returned entities
And a subtechniquesByTechniqueId map grouping subtechniques under their parent technique ID
```

#### **Scenario: Consuming components receive the same data shape from both data sources**

**Automation**: 2 React unit tests — one with flag off, one with flag on.

```Gherkin
When useMitreConfiguration() resolves with the flag disabled and data from the legacy blob
And separately when it resolves with the flag enabled and data from the API
Then the shape of the returned MitreEntitySummaryCollection should be identical in both cases
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
Then all entities in all buckets should belong to the newer framework version
```

#### **Scenario: The entities API returns the older version when specified explicitly**

**Automation**: 1 integration test.

```Gherkin
Given Saved Objects have been populated for both an older and a newer framework version
When the entities API is called with framework_version set to the older version
Then all entities in all buckets should belong to the older version
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

#### **Scenario: The entities API returns 200 with empty buckets when population has not completed**

**Automation**: 1 integration test.

```Gherkin
Given population has not yet completed and the index is empty
When the entities API is called
Then the response status should be 200
And the tactics, techniques, and subtechniques buckets should all be empty
```

#### **Scenario: The entities API returns 200 with empty buckets for an unknown `framework_version`**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called with a framework_version value that was never populated
Then the response status should be 200
And the tactics, techniques, and subtechniques buckets should all be empty
```

#### **Scenario: A population failure results in graceful degradation — API returns empty buckets, not 5xx**

**Automation**: 1 integration test.

```Gherkin
Given bulkCreate threw an error during plugin startup and Kibana completed startup normally
When the entities API is called
Then the response status should be 200
And all entity buckets should be empty
And no 5xx error should be returned
```
