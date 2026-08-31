# Test plan: Managed MITRE Data Layer <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

This is a test plan for the backend infrastructure of the Managed MITRE Data Source feature: Saved Object population, feature flag gating, the internal entities API, the server-side data client, multi-version coexistence, and error handling.

Out of scope for this plan: `GET /internal/mitre/search` route scenarios, Fleet out-of-band delivery, ATLAS framework, AI tooling, semantic search, and removal of the legacy blob.

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
  - [Bundled artifact](#bundled-artifact)
    - [**Scenario: The build script generates a valid artifact from the STIX bundle**](#scenario-the-build-script-generates-a-valid-artifact-from-the-stix-bundle)
    - [**Scenario: The build script correctly maps entities across multiple MITRE versions**](#scenario-the-build-script-correctly-maps-entities-across-multiple-mitre-versions)
  - [SO population lifecycle](#so-population-lifecycle)
    - [**Scenario: SO IDs are deterministic and match the expected format**](#scenario-so-ids-are-deterministic-and-match-the-expected-format)
    - [**Scenario: Successful population marks the service as initialized**](#scenario-successful-population-marks-the-service-as-initialized)
    - [**Scenario: A failure during population is caught, logged, and marks the service as uninitialized**](#scenario-a-failure-during-population-is-caught-logged-and-marks-the-service-as-uninitialized)
  - [Feature flag behavior](#feature-flag-behavior)
    - [**Scenario: When the flag is off, no routes are registered and no population runs**](#scenario-when-the-flag-is-off-no-routes-are-registered-and-no-population-runs)
    - [**Scenario: When the flag is on, routes are registered and population runs**](#scenario-when-the-flag-is-on-routes-are-registered-and-population-runs)
  - [Entities API: filtering and response shape](#entities-api-filtering-and-response-shape)
    - [**Scenario: The `types` parameter controls which entity buckets are populated**](#scenario-the-types-parameter-controls-which-entity-buckets-are-populated)
    - [**Scenario: `framework` defaults to "enterprise" when omitted**](#scenario-framework-defaults-to-enterprise-when-omitted)
    - [**Scenario: `framework_version` omitted resolves to the latest version**](#scenario-framework_version-omitted-resolves-to-the-latest-version)
    - [**Scenario: `framework_version` specified explicitly returns entities from that version**](#scenario-framework_version-specified-explicitly-returns-entities-from-that-version)
    - [**Scenario: `status` defaults to "active", excluding revoked and deprecated entities**](#scenario-status-defaults-to-active-excluding-revoked-and-deprecated-entities)
    - [**Scenario: `status=all` includes revoked and deprecated entities**](#scenario-statusall-includes-revoked-and-deprecated-entities)
    - [**Scenario: Revoked entities include `superseded_by_id` when a successor exists**](#scenario-revoked-entities-include-superseded_by_id-when-a-successor-exists)
    - [**Scenario: A multi-tactic technique appears once in the techniques bucket with all its tactic IDs**](#scenario-a-multi-tactic-technique-appears-once-in-the-techniques-bucket-with-all-its-tactic-ids)
    - [**Scenario: A technique present in both versions is returned with version-specific data**](#scenario-a-technique-present-in-both-versions-is-returned-with-version-specific-data)
  - [Entities API: input validation](#entities-api-input-validation)
    - [**Scenario: Invalid query parameters return 400**](#scenario-invalid-query-parameters-return-400)
  - [Server-side data client](#server-side-data-client)
    - [**Scenario: `getById()` returns the correct entity for a known ID**](#scenario-getbyid-returns-the-correct-entity-for-a-known-id)
    - [**Scenario: `getById()` returns `undefined` for an unknown ID**](#scenario-getbyid-returns-undefined-for-an-unknown-id)
    - [**Scenario: `getById()` resolves to the newest version when `frameworkVersion` is omitted**](#scenario-getbyid-resolves-to-the-newest-version-when-frameworkversion-is-omitted)
    - [**Scenario: `getById()` returns the specified version when `frameworkVersion` is provided**](#scenario-getbyid-returns-the-specified-version-when-frameworkversion-is-provided)
    - [**Scenario: `list()` returns a collection with populated typed buckets and default parameters**](#scenario-list-returns-a-collection-with-populated-typed-buckets-and-default-parameters)
    - [**Scenario: `list()` filters by `types`**](#scenario-list-filters-by-types)
    - [**Scenario: `list()` excludes revoked and deprecated entities by default**](#scenario-list-excludes-revoked-and-deprecated-entities-by-default)
    - [**Scenario: `list()` includes revoked and deprecated entities when `status` is "all"**](#scenario-list-includes-revoked-and-deprecated-entities-when-status-is-all)
    - [**Scenario: `list()` returns an empty collection when the index is empty**](#scenario-list-returns-an-empty-collection-when-the-index-is-empty)
    - [**Scenario: `search()` returns relevance-scored results ordered by score**](#scenario-search-returns-relevance-scored-results-ordered-by-score)
    - [**Scenario: `search()` respects the `size` parameter**](#scenario-search-respects-the-size-parameter)
    - [**Scenario: `search()` in keyword mode uses BM25 multi-match with field boosting**](#scenario-search-in-keyword-mode-uses-bm25-multi-match-with-field-boosting)
    - [**Scenario: `search()` filters by `types`**](#scenario-search-filters-by-types)
  - [Error handling](#error-handling)
    - [**Scenario: The entities API returns 404 when the feature flag is off**](#scenario-the-entities-api-returns-404-when-the-feature-flag-is-off)
    - [**Scenario: The entities API returns 200 with empty buckets when population has not completed**](#scenario-the-entities-api-returns-200-with-empty-buckets-when-population-has-not-completed)
    - [**Scenario: The entities API returns 200 with empty buckets for an unknown `framework_version`**](#scenario-the-entities-api-returns-200-with-empty-buckets-for-an-unknown-framework_version)
    - [**Scenario: When startup population failed, the first API call triggers lazy re-population and returns data on success**](#scenario-when-startup-population-failed-the-first-api-call-triggers-lazy-re-population-and-returns-data-on-success)
    - [**Scenario: If lazy re-population fails, the API returns 200 with empty buckets, not 5xx**](#scenario-if-lazy-re-population-fails-the-api-returns-200-with-empty-buckets-not-5xx)
    - [**Scenario: Concurrent API calls during re-population do not trigger multiple simultaneous re-population attempts**](#scenario-concurrent-api-calls-during-re-population-do-not-trigger-multiple-simultaneous-re-population-attempts)

## Useful information

### Tickets

- [Common tickets](./mitre_common_info.md#tickets).

### Terminology

- [Common terminology](./mitre_common_info.md#terminology).

## Requirements

### Assumptions

- [Common assumptions](./mitre_common_info.md#common-assumptions).

### Technical requirements

- Population must be idempotent: running on every restart must not duplicate entities (`bulkCreate` uses `overwrite: true`).
- Population must not block or crash Kibana startup on failure, any errors must be caught and logged.
- SO IDs must be deterministic (`{framework}:{framework_version}:{mitre_id}`) to allow multiple versions to coexist without ID collisions.
- Reads must return empty results gracefully (no error) when population has not yet completed.
- Routes must not be registered when the feature flag is off.
- All API query parameters must be bounded: `framework_version` max 32 characters, `types` array max 3 elements.

### Product requirements

- [Common product requirements](./mitre_common_info.md#common-product-requirements).
- Server-side consumers (e.g. future AI tooling) can call the data client without knowing the underlying SO structure.

## Scenarios

### Bundled artifact

#### **Scenario: The build script generates a valid artifact from the STIX bundle**

**Automation**: 1 unit test.

```Gherkin
When the build script is run against a STIX bundle
Then every entity in the output artifact should pass the schema validation
And each tactic's position should be correctly derived
And each technique's tactic_ids should be resolved from the bundle
```

#### **Scenario: The build script correctly maps entities across multiple MITRE versions**

**Automation**: 1 unit test.

```Gherkin
When the build script is run against STIX bundles for two different framework versions
Then each entity should carry the framework_version derived from its source bundle
And entities from different versions should be present as distinct entries in the artifact
And an entity ID present in both versions should appear twice with version-specific metadata
```

### SO population lifecycle

#### **Scenario: SO IDs are deterministic and match the expected format**

**Automation**: 1 integration test (direct ES query on the `mitre-attack-entity` SO type).

```Gherkin
Given the plugin start() lifecycle has completed
When mitre-attack-entity Saved Objects are queried directly in the .kibana_security_solution index
Then each document's _id should follow the format {framework}:{framework_version}:{mitre_id}
And the total document count should match the number of entities in the bundled artifact
```

#### **Scenario: Successful population marks the service as initialized**

**Automation**: 1 unit test.

```Gherkin
Given population resolves successfully during plugin startup
When MitreAttackService.populate() completes
Then the service's initialized flag should be true
And successful population should be logged at an appropriate level
```

#### **Scenario: A failure during population is caught, logged, and marks the service as uninitialized**

**Automation**: 1 unit test.

```Gherkin
Given population throws an error during plugin startup
When the plugin start() lifecycle executes
Then the error should be caught and logged
And start() should resolve without rethrowing
And the service's initialized flag should be false
```

### Feature flag behavior

#### **Scenario: When the flag is off, no routes are registered and no population runs**

**Automation**: 1 integration test.

```Gherkin
Given the feature flag is disabled
When Kibana starts
Then a request to the entities API should return 404
And no mitre-attack-entity Saved Objects should be created
```

#### **Scenario: When the flag is on, routes are registered and population runs**

**Automation**: 1 integration test.

```Gherkin
Given the feature flag is enabled
When Kibana starts
Then a request to the entities API should return 200 with populated entities
And mitre-attack-entity Saved Objects should exist in the index
```

### Entities API: filtering and response shape

#### **Scenario: The `types` parameter controls which entity buckets are populated**

**Automation**: 1 integration test per row.

```Gherkin
When the entities API is called with <types_param>
Then <populated_buckets> should be populated
And <empty_buckets> should be empty
```

**Examples:**

| `<types_param>`                      | `<populated_buckets>`              | `<empty_buckets>`                  |
| ------------------------------------ | ---------------------------------- | ---------------------------------- |
| no types parameter                   | tactics, techniques, subtechniques | none                               |
| tactic                               | tactics                            | techniques and subtechniques       |
| technique                            | techniques                         | tactics and subtechniques          |
| subtechnique                         | subtechniques                      | tactics and techniques             |
| technique and subtechnique           | techniques and subtechniques       | tactics                            |

#### **Scenario: `framework` defaults to "enterprise" when omitted**

**Automation**: 1 integration test.

```Gherkin
When the entities API is called without a framework parameter
Then the response framework field should equal "enterprise"
```

#### **Scenario: `framework_version` omitted resolves to the latest version**

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
Given the index contains entities with revoked=true and deprecated=true
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

#### **Scenario: Revoked entities include `superseded_by_id` when a successor exists**

**Automation**: 1 integration test.

```Gherkin
Given the index contains a revoked entity whose superseded_by_id field lists a successor
When the entities API is called with status=all
Then the revoked entity should appear in the response
And its superseded_by_id field should contain the expected successor ID
```

#### **Scenario: A multi-tactic technique appears once in the techniques bucket with all its tactic IDs**

**Automation**: 1 integration test.

```Gherkin
Given the index contains a technique mapped to more than one tactic
When the entities API is called with types=technique
Then the multi-tactic technique should appear exactly once in the techniques bucket
And its tactic_ids field should contain all tactic IDs it is mapped to
```

#### **Scenario: A technique present in both versions is returned with version-specific data**

**Automation**: 1 integration test.

```Gherkin
Given the same technique ID exists in both an older and a newer framework version
When the entities API is called once for the older version and once for the newer version
Then each response should contain that technique with the metadata for the respective version
And the two entities should share the same id but differ in their version-specific fields
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
| `framework_version` | string longer than 32 characters                              |
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

**Automation**: 1 unit test.

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

**Automation**: 1 unit test.

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

#### **Scenario: When startup population failed, the first API call triggers lazy re-population and returns data on success**

**Automation**: 1 integration test.

```Gherkin
Given startup population failed and the service's initialized flag is false
And the bundled artifact is available for re-population
When the entities API is called
Then the service should attempt population before serving the request
And if re-population succeeds the response should contain the expected entities
And the service's initialized flag should be true after the call
```

#### **Scenario: If lazy re-population fails, the API returns 200 with empty buckets, not 5xx**

**Automation**: 1 unit test.

```Gherkin
Given startup population failed and re-population on the API call also fails
When the entities API is called
Then the response status should be 200
And all entity buckets should be empty
And no 5xx error should be returned
```

#### **Scenario: Concurrent API calls during re-population do not trigger multiple simultaneous re-population attempts**

**Automation**: 1 unit test.

```Gherkin
Given the service's initialized flag is false and re-population is already in progress
When a second API call arrives before re-population completes
Then the second call should not trigger an additional population attempt
And the isInitializing guard should prevent concurrent re-population
```
