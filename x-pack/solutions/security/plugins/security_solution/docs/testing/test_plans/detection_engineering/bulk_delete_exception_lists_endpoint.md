# Test plan: bulk delete exception lists API endpoint <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

This is a test plan for `POST /api/exception_lists/_bulk_delete`, a new API endpoint that deletes up to 100 exception lists (and their items) in a single request. The endpoint accepts either saved object `ids` or human-readable `list_ids` (not both), cascades item deletion per list, reports per-list success/failure, and respects existing exception-list RBAC.

The existing single-delete endpoint (`DELETE /api/exception_lists`) is **not** changed by this work and is out of scope for this plan.

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
- **Partial failure**: the endpoint always returns HTTP 200 with `{ deleted, errors }` for per-list outcomes. HTTP 4xx/5xx is reserved for validation or system-level failures.
- **PIT streaming**: items are deleted one page (1,000) at a time via a Point-In-Time finder rather than loading all item IDs into memory.

## Requirements

### Assumptions

- All scenarios are executed under a Trial license (complete tier for serverless) unless stated otherwise.
- The user has the `exceptions-all` Kibana privilege unless the scenario explicitly tests a different role.
- Exception lists and items are created fresh per scenario and cleaned up after each run.
- The endpoint is available on both ESS and serverless deployments.

### Non-functional requirements

- The endpoint must handle up to 100 lists per request.
- Item cascade uses bounded concurrency (`pMap`, concurrency = 10) across lists.
- Item deletion uses PIT streaming (1,000 items per page) to bound memory usage regardless of item count.
- The PIT finder is always closed in a `finally` block, even on mid-stream errors.

### Product requirements

Functional requirements derived from [#276458](https://github.com/elastic/kibana/issues/276458):

- User can delete multiple exception lists in one request by `id` or `list_id`.
- Exactly one of `ids` or `list_ids` must be provided (not both, not neither).
- Each array must contain at least 1 and at most 100 entries.
- Deleting a list cascades to all its exception list items.
- Per-list success/failure is reported in the response body.
- One list's failure does not abort other lists in the batch.
- Duplicate identifiers in the request are deduplicated before processing.
- The endpoint respects space scoping and exception-list RBAC (`exceptions-all` privilege required).
- Passing an exception list **item** saved object ID is rejected (returns 404 for that entry) without deleting the item or its parent list.

## Scenarios

### Core functionality — delete by list_id

#### **Scenario: Delete multiple exception lists by list_id**

**Automation**: 1 integration test.

```Gherkin
Given 3 exception lists exist with list_ids "list-1", "list-2", and "list-3"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1", "list-2"]
Then the response status is 200
And the response body "deleted" array contains 2 entries for "list-1" and "list-2"
And the response body "errors" array is empty
And exception list "list-3" still exists
```

#### **Scenario: Delete a single exception list by list_id**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"]
Then the response status is 200
And the response body "deleted" array contains 1 entry for "list-1"
And the response body "errors" array is empty
```

### Core functionality — delete by id

#### **Scenario: Delete multiple exception lists by saved object id**

**Automation**: 1 integration test.

```Gherkin
Given 2 exception lists exist with saved object ids "so-1" and "so-2"
When the user calls POST /api/exception_lists/_bulk_delete with ids ["so-1", "so-2"]
Then the response status is 200
And the response body "deleted" array contains 2 entries matching "so-1" and "so-2"
And the response body "errors" array is empty
```

### Item cascade

#### **Scenario: Deleting a list cascades to its exception list items**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"]
Then the response status is 200
And the list is in the "deleted" array
And the exception list item no longer exists (GET returns 404)
```

#### **Scenario: Items are deleted before the list container**

**Automation**: unit tests (call order assertion).

```Gherkin
Given an exception list "list-1" exists with items
When the bulk delete service processes "list-1"
Then deleteExceptionListItemsByListStreamed is called before savedObjectsClient.delete
```

**Notes**: This ordering prevents orphaned items. If the container were deleted first, the items would have no resolvable parent and could never be cleaned up. Verified via mock call-order assertions in the unit test suite.

### Partial failure and error reporting

#### **Scenario: Partial failure when some lists do not exist**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
And no exception list exists with list_id "does-not-exist"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1", "does-not-exist"]
Then the response status is 200
And the "deleted" array contains 1 entry for "list-1"
And the "errors" array contains 1 entry for "does-not-exist" with status_code 404
```

#### **Scenario: All lists not found returns only errors**

**Automation**: 1 integration test.

```Gherkin
Given no exception lists exist with list_ids "a" or "b"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["a", "b"]
Then the response status is 200
And the "deleted" array is empty
And the "errors" array contains 2 entries, each with status_code 404
```

#### **Scenario: Passing an exception list item saved object ID is rejected without side effects**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item (item saved object id "item-so-1")
When the user calls POST /api/exception_lists/_bulk_delete with ids ["item-so-1"]
Then the response status is 200
And the "deleted" array is empty
And the "errors" array contains 1 entry for "item-so-1" with status_code 404
And the exception list "list-1" still exists
And the exception list item "item-so-1" still exists
```

**Notes**: The service validates that resolved saved objects have `list_type: 'list'`; item saved objects (`list_type: 'item'`) are rejected as not found without any mutation.

#### **Scenario: Per-list error isolation**

**Automation**: unit tests.

```Gherkin
Given exception lists "list-1" and "list-2" exist
And the item cascade for "list-1" will fail with an internal error
When the bulk delete service processes both lists
Then "list-1" appears in the "errors" array
And "list-2" is still successfully deleted and appears in the "deleted" array
```

**Notes**: Each list is processed as an independent unit within the `pMap` loop. A failure in one list's item cascade or container delete does not abort or affect other lists.

### Input validation

#### **Scenario: Request with neither ids nor list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
Given an empty request body
When the user calls POST /api/exception_lists/_bulk_delete with body {}
Then the response status is 400
```

#### **Scenario: Request with empty ids array returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_delete with body { ids: [] }
Then the response status is 400
```

#### **Scenario: Request with empty list_ids array returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_delete with body { list_ids: [] }
Then the response status is 400
```

#### **Scenario: Request with both ids and list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists
When the user calls POST /api/exception_lists/_bulk_delete with body { ids: ["so-1"], list_ids: ["list-1"] }
Then the response status is 400
```

**Notes**: The schema uses `oneOf` — exactly one of the two shapes is accepted. Providing both fields causes schema validation to fail.

#### **Scenario: Request exceeding 100 list_ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_delete with 101 list_ids
Then the response status is 400
```

#### **Scenario: Request exceeding 100 ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_delete with 101 ids
Then the response status is 400
```

### Deduplication and retry safety

#### **Scenario: Duplicate ids in the request are deduplicated**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with saved object id "so-1"
When the user calls POST /api/exception_lists/_bulk_delete with ids ["so-1", "so-1"]
Then the response status is 200
And the "deleted" array contains exactly 1 entry
And the "errors" array is empty
```

#### **Scenario: Duplicate list_ids in the request are deduplicated**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1", "list-1"]
Then the response status is 200
And the "deleted" array contains exactly 1 entry
And the "errors" array is empty
```

**Notes**: Deduplication uses `new Set()` before processing, making the request safe to retry — a second call with the same IDs will report those as 404 (already deleted) without side effects.

### Namespace support

#### **Scenario: Delete lists in the agnostic namespace**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1" and namespace_type "agnostic"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"] and namespace_type "agnostic"
Then the response status is 200
And the "deleted" array contains 1 entry
And the "errors" array is empty
```

#### **Scenario: Namespace type defaults to single when not provided**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with list_id "list-1" in the single (space-scoped) namespace
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"] and no namespace_type
Then the response status is 200
And the list is deleted from the current space
```

#### **Scenario: Lists in a different namespace are not affected**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists in the agnostic namespace
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"] and namespace_type "single"
Then the response status is 200
And the "errors" array contains 1 entry for "list-1" with status_code 404
And the agnostic list "list-1" still exists
```

### Authorization / RBAC

#### **Scenario: User with exceptions-all privilege can bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_all" role
And an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"]
Then the response status is 200
And the "deleted" array contains 1 entry
```

#### **Scenario: User with exceptions-read privilege cannot bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_read" role
And an exception list exists with list_id "list-1"
When the user calls POST /api/exception_lists/_bulk_delete with list_ids ["list-1"]
Then the response status is 403
```

#### **Scenario: Unauthenticated request returns 401**

**Automation**: 1 integration test.

```Gherkin
Given no authentication credentials are provided
When the user calls POST /api/exception_lists/_bulk_delete
Then the response status is 401
```
