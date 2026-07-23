# Test plan: exception lists bulk action — delete <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

This is a test plan for the `delete` action on `POST /api/exception_lists/_bulk_action`, a new API endpoint that deletes up to 100 exception lists (and their items) in a single request. The endpoint accepts an `action` discriminant and either saved object `ids` or human-readable `list_ids` (not both), cascades item deletion per list, reports per-list success/failure with a summary, and respects existing exception-list RBAC.

The existing single-delete endpoint (`DELETE /api/exception_lists`) is **not** changed by this work and is out of scope for this plan.

**RFC:** [API Design — Exception Lists Bulk Action Endpoint](https://docs.google.com/document/d/1-lMRDfNEqCGaODQmHDlIT6KYECViz3YNbj5qso2KWNM/edit)

## Table of contents <!-- omit from toc -->

- [Useful information](#useful-information)
  - [Tickets](#tickets)
  - [Terminology](#terminology)
- [Requirements](#requirements)
  - [Assumptions](#assumptions)
  - [Non-functional requirements](#non-functional-requirements)
  - [Product requirements](#product-requirements)
- [Scenarios](#scenarios)
  - [Core functionality — delete by list_id](#core-functionality--delete-by-list_id)
  - [Core functionality — delete by id](#core-functionality--delete-by-id)
  - [Item cascade](#item-cascade)
  - [Partial failure and error reporting](#partial-failure-and-error-reporting)
  - [Response shape](#response-shape)
  - [Input validation](#input-validation)
  - [Deduplication and retry safety](#deduplication-and-retry-safety)
  - [Namespace support](#namespace-support)
  - [Authorization / RBAC](#authorization--rbac)

## Useful information

### Tickets

- [Bulk APIs for Exception/Value Lists (epic)](https://github.com/elastic/kibana/issues/266239)
- [Add a bulk delete API for exception lists](https://github.com/elastic/kibana/issues/276458)
- [Agree on test plan strategy](https://github.com/elastic/security-team/issues/18050) (internal)

### Terminology

- **Exception list**: a saved object container (`list_type: 'list'`) that groups exception list items. Identified by a saved object `id` (UUID) and a human-readable `list_id` (string).
- **Exception list item**: a saved object (`list_type: 'item'`) that belongs to exactly one exception list, identified by `list_id`.
- **Item cascade**: when a list is deleted, all its items are deleted first, then the list container itself. This prevents orphaned items.
- **Namespace type**: `single` (space-scoped) or `agnostic` (global across all spaces).
- **Partial failure**: the endpoint always returns HTTP 200 with `{ success, summary, deleted, errors }` for per-list outcomes. HTTP 4xx/5xx is reserved for validation or system-level failures.

## Requirements

### Assumptions

- All scenarios are executed under a Trial license (complete tier for serverless) unless stated otherwise.
- The user has the `exceptions-all` Kibana privilege unless the scenario explicitly tests a different role.
- Exception lists and items are created fresh per scenario and cleaned up after each run.
- The endpoint is available on both ESS and serverless deployments.
- All requests include `"action": "delete"` in the request body unless testing action validation.

### Non-functional requirements

- The endpoint must handle up to 100 lists per request.
- Item cascade uses bounded concurrency across lists.
- Item deletion uses PIT streaming (1,000 items per page) to bound memory usage regardless of item count.

### Product requirements

Functional requirements derived from [#276458](https://github.com/elastic/kibana/issues/276458) and the [API design RFC](https://docs.google.com/document/d/1-lMRDfNEqCGaODQmHDlIT6KYECViz3YNbj5qso2KWNM/edit):

- User can delete multiple exception lists in one request by `id` or `list_id`.
- The request must include `action: "delete"`.
- Exactly one of `ids` or `list_ids` must be provided (not both, not neither).
- Each array must contain at least 1 and at most 100 entries.
- Deleting a list cascades to all its exception list items.
- The response includes `success`, `summary` (total/succeeded/failed), `deleted`, and `errors`.
- One list's failure does not abort other lists in the batch.
- Duplicate identifiers in the request are deduplicated.
- The endpoint respects space scoping and exception-list RBAC (`exceptions-all` privilege required).
- Passing an exception list **item** saved object ID is rejected (returns 404 for that entry) without side effects.
- Mixed namespace types (`single` + `agnostic`) in a single request are not supported.

## Scenarios

### Core functionality — delete by list_id

#### **Scenario: Delete multiple exception lists by list_id**

**Automation**: 1 integration test.

```Gherkin
Given 3 exception lists exist with list_ids "list-1", "list-2", and "list-3"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1", "list-2"]
Then the response status is 200
And "success" is true
And "summary.total" is 2 and "summary.succeeded" is 2 and "summary.failed" is 0
And the "deleted" array contains 2 entries for "list-1" and "list-2"
And the "errors" array is empty
And exception list "list-3" still exists
```

#### **Scenario: Delete a single exception list by list_id**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1"]
Then the response status is 200
And "success" is true
And "summary.succeeded" is 1
And the "deleted" array contains 1 entry for "list-1"
And the "errors" array is empty
```

### Core functionality — delete by id

#### **Scenario: Delete multiple exception lists by saved object id**

**Automation**: 1 integration test.

```Gherkin
Given 2 exception lists exist with saved object ids "so-1" and "so-2"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and ids ["so-1", "so-2"]
Then the response status is 200
And "success" is true
And "summary.succeeded" is 2
And the "deleted" array contains 2 entries matching "so-1" and "so-2"
And the "errors" array is empty
```

### Item cascade

#### **Scenario: Deleting a list cascades to its exception list items**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1"]
Then the response status is 200
And the list is in the "deleted" array
And the exception list item no longer exists (GET returns 404)
```

#### **Scenario: Items are deleted before the list container**

**Automation**: unit tests (call order assertion).

```Gherkin
Given an exception list "list-1" exists with items
When the bulk delete service processes "list-1"
Then items are deleted before the list container
```

**Notes**: This ordering prevents orphaned items. If the container were deleted first, the items would have no resolvable parent and could never be cleaned up.

### Partial failure and error reporting

#### **Scenario: Partial failure when some lists do not exist**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
And no exception list exists with list_id "does-not-exist"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1", "does-not-exist"]
Then the response status is 200
And "success" is false
And "summary.total" is 2 and "summary.succeeded" is 1 and "summary.failed" is 1
And the "deleted" array contains 1 entry for "list-1"
And the "errors" array contains 1 entry with status_code 404 and lists [{ list_id: "does-not-exist" }]
```

#### **Scenario: All lists not found returns only errors**

**Automation**: 1 integration test.

```Gherkin
Given no exception lists exist with list_ids "a" or "b"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["a", "b"]
Then the response status is 200
And "success" is false
And "summary.total" is 2 and "summary.succeeded" is 0 and "summary.failed" is 2
And the "deleted" array is empty
And the "errors" array contains 2 entries, each with status_code 404
```

#### **Scenario: Passing an exception list item saved object ID is rejected without side effects**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item (item saved object id "item-so-1")
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and ids ["item-so-1"]
Then the response status is 200
And "success" is false
And the "deleted" array is empty
And the "errors" array contains 1 entry with status_code 404 and lists [{ id: "item-so-1" }]
And the exception list "list-1" still exists
And the exception list item "item-so-1" still exists
```

#### **Scenario: Per-list error isolation**

**Automation**: unit tests.

```Gherkin
Given exception lists "list-1" and "list-2" exist
And the item cascade for "list-1" will fail with an internal error
When the bulk delete service processes both lists
Then "list-1" appears in the "errors" array
And "list-2" is still successfully deleted and appears in the "deleted" array
```

### Response shape

#### **Scenario: Successful response includes summary counts**

**Automation**: 1 integration test.

```Gherkin
Given 3 exception lists exist with list_ids "list-1", "list-2", and "list-3"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1", "list-2", "list-3"]
Then the response status is 200
And "success" is true
And "summary" is { "total": 3, "succeeded": 3, "failed": 0 }
And the "deleted" array has length 3
And the "errors" array is empty
```

#### **Scenario: Partial failure sets success to false**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
And no exception list exists with list_id "missing"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1", "missing"]
Then the response status is 200
And "success" is false
And "summary.failed" is 1
```

#### **Scenario: Error entries carry the identifier type used by the caller**

**Automation**: 1 integration test.

```Gherkin
Given no exception list exists with list_id "does-not-exist"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["does-not-exist"]
Then the "errors[0].lists[0].list_id" is "does-not-exist"
And "errors[0].lists[0].id" is null
```

```Gherkin
Given no exception list exists with id "missing-so-id"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and ids ["missing-so-id"]
Then the "errors[0].lists[0].id" is "missing-so-id"
And "errors[0].lists[0].list_id" is null
```

### Input validation

#### **Scenario: Request with unrecognized action returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body { "action": "unknown", "list_ids": ["list-1"] }
Then the response status is 400
```

#### **Scenario: Request without action field returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body { "list_ids": ["list-1"] }
Then the response status is 400
```

#### **Scenario: Request with neither ids nor list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body { "action": "delete" }
Then the response status is 400
```

#### **Scenario: Request with empty ids array returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body { "action": "delete", "ids": [] }
Then the response status is 400
```

#### **Scenario: Request with empty list_ids array returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body { "action": "delete", "list_ids": [] }
Then the response status is 400
```

#### **Scenario: Request with both ids and list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists
When the user calls POST /api/exception_lists/_bulk_action with body { "action": "delete", "ids": ["so-1"], "list_ids": ["list-1"] }
Then the response status is 400
```

#### **Scenario: Request exceeding 100 list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and 101 list_ids
Then the response status is 400
```

#### **Scenario: Request exceeding 100 ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and 101 ids
Then the response status is 400
```

### Deduplication and retry safety

#### **Scenario: Duplicate ids in the request are deduplicated**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with saved object id "so-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and ids ["so-1", "so-1"]
Then the response status is 200
And "summary.total" is 1
And the "deleted" array contains exactly 1 entry
And the "errors" array is empty
```

#### **Scenario: Duplicate list_ids in the request are deduplicated**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1", "list-1"]
Then the response status is 200
And "summary.total" is 1
And the "deleted" array contains exactly 1 entry
And the "errors" array is empty
```

#### **Scenario: Retrying a successful delete request returns 404 for already-deleted lists**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1"]
Then the response status is 200 and "success" is true
When the user re-issues the same request
Then the response status is 200
And "success" is false
And the "deleted" array is empty
And the "errors" array contains 1 entry for "list-1" with status_code 404
```

**Notes**: A 404 error for a target the caller intended to delete should be treated as success — the list is gone.

### Namespace support

#### **Scenario: Delete lists in the agnostic namespace**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1" and namespace_type "agnostic"
When the user calls POST /api/exception_lists/_bulk_action with action "delete", list_ids ["list-1"], and namespace_type "agnostic"
Then the response status is 200
And the "deleted" array contains 1 entry
And the "errors" array is empty
```

#### **Scenario: Namespace type defaults to single when not provided**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1" in the single (space-scoped) namespace
When the user calls POST /api/exception_lists/_bulk_action with action "delete", list_ids ["list-1"], and no namespace_type
Then the response status is 200
And the list is deleted from the current space
```

#### **Scenario: Lists in a different namespace are not affected**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists in the agnostic namespace
When the user calls POST /api/exception_lists/_bulk_action with action "delete", list_ids ["list-1"], and namespace_type "single"
Then the response status is 200
And "success" is false
And the "errors" array contains 1 entry for "list-1" with status_code 404
And the agnostic list "list-1" still exists
```

**Notes**: `namespace_type` applies uniformly to the entire request. Callers cannot mix `single` and `agnostic` deletions in one call.

### Authorization / RBAC

#### **Scenario: User with exceptions-all privilege can bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_all" role
And an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1"]
Then the response status is 200
And the "deleted" array contains 1 entry
```

#### **Scenario: User with exceptions-read privilege cannot bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_read" role
And an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and list_ids ["list-1"]
Then the response status is 403
```

#### **Scenario: Unauthenticated request returns 401**

**Automation**: 1 integration test.

```Gherkin
Given no authentication credentials are provided
When the user calls POST /api/exception_lists/_bulk_action
Then the response status is 401
```
