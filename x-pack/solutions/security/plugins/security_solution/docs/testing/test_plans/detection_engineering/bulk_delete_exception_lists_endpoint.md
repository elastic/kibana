# Test plan: exception lists bulk action — delete <!-- omit from toc -->

**Status**: `in progress`.

## Summary <!-- omit from toc -->

Test plan for the `delete` action on `POST /api/exception_lists/_bulk_action`, an internal API endpoint that deletes up to 100 exception lists (and their items) in a single request. The endpoint accepts saved object `ids`, cascades item deletion per list, checks for rule references before deleting (blocking linked lists with 409), reports per-list success/failure with a summary, and respects existing exception-list RBAC.

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
  - [Core functionality](#core-functionality)
  - [Item cascade](#item-cascade)
  - [Rule reference checking](#rule-reference-checking)
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
- [Follow-up: Rule unlinking on exception list deletion](https://github.com/elastic/kibana/issues/281072)
- [Agree on test plan strategy](https://github.com/elastic/security-team/issues/18050) (internal)

### Terminology

- **Exception list**: a saved object container (`list_type: 'list'`) that groups exception list items. Identified by a saved object `id` (UUID) and a human-readable `list_id` (string).
- **Exception list item**: a saved object (`list_type: 'item'`) that belongs to exactly one exception list, identified by `list_id`.
- **Item cascade**: when a list is deleted, all its items are deleted first, then the list container itself. This prevents orphaned items.
- **Rule reference**: a detection rule's `params.exceptionsList` entry and corresponding `SavedObjectReference` pointing to an exception list. The bulk action endpoint checks for these references before deletion.
- **Namespace type**: `single` (space-scoped) or `agnostic` (global across all spaces).
- **Partial failure**: the endpoint always returns HTTP 200 with `{ success, results, errors, summary }` for per-list outcomes. HTTP 4xx/5xx is reserved for validation or system-level failures.

## Requirements

### Assumptions

- All scenarios are executed under a Trial license (complete tier for serverless) unless stated otherwise.
- The user has the `exceptions-all` Kibana privilege unless the scenario explicitly tests a different role.
- Exception lists and items are created fresh per scenario and cleaned up after each run.
- The endpoint is available on both ESS and serverless deployments (internal access).
- All requests include `"action": "delete"` in the request body unless testing action validation.

### Non-functional requirements

- The endpoint must handle up to 100 lists per request.
- Item cascade uses bounded concurrency across lists (currently 10).
- Item deletion uses PIT streaming (1,000 items per page) to bound memory usage regardless of item count.

### Product requirements

Functional requirements derived from [#276458](https://github.com/elastic/kibana/issues/276458) and the [API design RFC](https://docs.google.com/document/d/1-lMRDfNEqCGaODQmHDlIT6KYECViz3YNbj5qso2KWNM/edit):

- User can delete multiple exception lists in one request by saved object `id`.
- The request must include `action: "delete"`.
- The `ids` array must contain at least 1 and at most 100 entries.
- Deleting a list cascades to all its exception list items.
- Lists referenced by detection rules are blocked (409) with rule details in the error response. Endpoint-type lists are exempt from this check.
- The response includes `success`, `results`, `errors`, and `summary` (total/succeeded/failed/skipped).
- One list's failure does not abort other lists in the batch.
- Duplicate identifiers in the request are deduplicated (tracked in `summary.skipped`).
- The endpoint respects space scoping and exception-list RBAC (`exceptions-all` privilege required).
- Passing an exception list **item** saved object ID is rejected (returns 404 for that entry) without side effects.

## Scenarios

### Core functionality

#### **Scenario: Delete multiple exception lists by saved object id**

**Automation**: 1 integration test.

```Gherkin
Given 2 exception lists exist with saved object ids "so-1" and "so-2"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1", "so-2"] }
Then the response status is 200
And "success" is true
And "summary.succeeded" is 2
And the "results" array contains 2 entries matching "so-1" and "so-2"
And the "errors" array is empty
```

#### **Scenario: Delete a single exception list**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with saved object id "so-1"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1"] }
Then the response status is 200
And "success" is true
And "summary.succeeded" is 1
And the "results" array contains 1 entry for "so-1"
```

#### **Scenario: Response includes full exception list objects in results**

**Automation**: 1 integration test.

```Gherkin
Given a "detection" exception list exists with known properties (name, description, tags, os_types)
When the user deletes it via the bulk action endpoint
Then each entry in results contains: id, list_id, type, name, description, namespace_type, immutable, os_types, tags, version, _version, tie_breaker_id, created_at, created_by, updated_at, updated_by
```

### Item cascade

#### **Scenario: Deleting a list cascades to its exception list items**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["list-1-so-id"] }
Then the response status is 200
And the list is in the "results" array
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

### Rule reference checking

#### **Scenario: Block deletion of a shared exception list linked to rules**

**Automation**: 1 integration test + unit tests.

```Gherkin
Given a "detection" exception list "shared-list" is referenced by rules "rule-A" and "rule-B"
When the user sends bulk action delete with ids: ["shared-list-so-id"]
Then the response status is 200
And "success" is false
And "results" is empty
And "errors" contains 1 entry with status_code 409
And errors[0].message indicates the list is linked to 2 rules
And errors[0].rule_references contains entries for "rule-A" and "rule-B"
  with fields: rule_id, id, name
And "summary.failed" is 1
And the exception list still exists (not deleted)
```

#### **Scenario: Block deletion of a rule_default list when owning rule exists**

**Automation**: 1 integration test.

```Gherkin
Given a rule "my-rule" exists with a "rule_default" exception list "default-list"
When the user sends bulk action delete with ids: ["default-list-so-id"]
Then the response status is 200
And "success" is false
And "errors" contains 1 entry with status_code 409
And errors[0].rule_references contains "my-rule" details
And the rule_default list still exists
```

#### **Scenario: Allow deletion of endpoint-type exception lists**

**Automation**: 1 integration test.

```Gherkin
Given an "endpoint" exception list exists (no rule reference check performed)
When the user sends bulk action delete with ids: ["endpoint-list-so-id"]
Then the response status is 200
And "success" is true
And "results" contains the endpoint list
And the list is deleted
```

#### **Scenario: Mix of linked and unlinked lists produces partial failure**

**Automation**: 1 integration test.

```Gherkin
Given "unlinked-list" has no rule references
And "linked-list" is referenced by rule "some-rule"
When the user sends bulk action delete with ids: ["unlinked-list-id", "linked-list-id"]
Then the response status is 200
And "success" is false
And "results" contains "unlinked-list" (deleted successfully)
And "errors" contains 1 entry for "linked-list-id" with status_code 409
And "summary.succeeded" is 1
And "summary.failed" is 1
```

#### **Scenario: Error response includes referencing rule details**

**Automation**: 1 integration test.

```Gherkin
Given "shared-list" is linked to 3 rules with known rule_id, id, and name
When the user sends bulk action delete with ids: ["shared-list-id"]
Then errors[0].rule_references is an array of 3 objects
And each rule reference has:
  | field   | type   |
  | rule_id | string |
  | id      | string |
  | name    | string |
And rule_id, id, and name match the actual rules linked to the list
```

### Partial failure and error reporting

#### **Scenario: Partial failure when some lists do not exist**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with saved object id "so-1"
And no exception list exists with id "fake-id"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1", "fake-id"] }
Then the response status is 200
And "success" is false
And "summary.total" is 2 and "summary.succeeded" is 1 and "summary.failed" is 1
And the "results" array contains 1 entry for "so-1"
And the "errors" array contains 1 entry with status_code 404 and lists [{ id: "fake-id" }]
```

#### **Scenario: All lists not found returns only errors**

**Automation**: 1 integration test.

```Gherkin
Given no exception lists exist with ids "fake-1" or "fake-2"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["fake-1", "fake-2"] }
Then the response status is 200
And "success" is false
And "summary.total" is 2 and "summary.succeeded" is 0 and "summary.failed" is 2
And the "results" array is empty
And the "errors" array contains 2 entries, each with status_code 404
```

#### **Scenario: Passing an exception list item saved object ID is rejected without side effects**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "list-1" exists with 1 exception list item (item saved object id "item-so-1")
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["item-so-1"] }
Then the response status is 200
And "success" is false
And the "results" array is empty
And the "errors" array contains 1 entry with status_code 404 and lists [{ id: "item-so-1" }]
And the exception list "list-1" still exists
And the exception list item "item-so-1" still exists
```

#### **Scenario: Per-list error isolation**

**Automation**: unit tests.

```Gherkin
Given exception lists "so-1" and "so-2" exist
And the item cascade for "so-1" will fail with an internal error
When the bulk delete service processes both lists
Then "so-1" appears in the "errors" array
And "so-2" is successfully deleted and appears in the "results" array
```

### Response shape

#### **Scenario: Successful response includes summary counts**

**Automation**: 1 integration test.

```Gherkin
Given 3 exception lists exist
When the user calls POST /api/exception_lists/_bulk_action with action "delete" and all 3 ids
Then the response status is 200
And "success" is true
And "summary" is { "total": 3, "succeeded": 3, "failed": 0, "skipped": 0 }
And the "results" array has length 3
And the "errors" array is empty
```

#### **Scenario: Partial failure sets success to false**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with id "so-1"
And no exception list exists with id "missing"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1", "missing"] }
Then the response status is 200
And "success" is false
And "summary.failed" is 1
```

### Input validation

#### **Scenario: Request with unrecognized action returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "unknown", "ids": ["so-1"] }
Then the response status is 400
```

#### **Scenario: Request without action field returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "ids": ["so-1"] }
Then the response status is 400
```

#### **Scenario: Request without ids returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete" }
Then the response status is 400
```

#### **Scenario: Request with empty ids array returns 400**

**Automation**: 1 integration test.

```Gherkin
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": [] }
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
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1", "so-1"] }
Then the response status is 200
And "summary.total" is 1
And "summary.skipped" is 1
And the "results" array contains exactly 1 entry
And the "errors" array is empty
```

#### **Scenario: Retrying a successful delete request returns 404 for already-deleted lists**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists with id "so-1"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1"] }
Then the response status is 200 and "success" is true
When the user re-issues the same request
Then the response status is 200
And "success" is false
And the "results" array is empty
And the "errors" array contains 1 entry for "so-1" with status_code 404
```

**Notes**: A 404 error for a target the caller intended to delete should be treated as success — the list is gone.

### Namespace support

#### **Scenario: Delete lists in the agnostic namespace**

**Automation**: 1 integration test.

```Gherkin
Given an agnostic exception list exists with id "agnostic-so-id"
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["agnostic-so-id"], "namespace_type": "agnostic" }
Then the response status is 200
And the "results" array contains 1 entry
And the "errors" array is empty
```

#### **Scenario: Namespace type defaults to single when not provided**

**Automation**: 1 integration test.

```Gherkin
Given an exception list exists in the single (space-scoped) namespace
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1"] }
Then the response status is 200
And the list is deleted from the current space
```

#### **Scenario: Lists in a different namespace are not affected**

**Automation**: 1 integration test.

```Gherkin
Given an exception list "so-1" exists in the agnostic namespace
When the user calls POST /api/exception_lists/_bulk_action with body:
  { "action": "delete", "ids": ["so-1"], "namespace_type": "single" }
Then the response status is 200
And "success" is false
And the "errors" array contains 1 entry for "so-1" with status_code 404
And the agnostic list still exists
```

**Notes**: `namespace_type` applies uniformly to the entire request. Callers cannot mix `single` and `agnostic` deletions in one call.

### Authorization / RBAC

#### **Scenario: User with exceptions-all privilege can bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_all" role
And an exception list exists
When the user calls POST /api/exception_lists/_bulk_action with a valid delete request
Then the response status is 200
And the "results" array contains 1 entry
```

#### **Scenario: User with exceptions-read privilege cannot bulk delete**

**Automation**: 1 integration test (ESS only — `@skipInServerless`).

```Gherkin
Given a user with the "rules_read_exceptions_read" role
And an exception list exists
When the user calls POST /api/exception_lists/_bulk_action with a valid delete request
Then the response status is 403
```

#### **Scenario: Unauthenticated request returns 401**

**Automation**: 1 integration test.

```Gherkin
Given no authentication credentials are provided
When the user calls POST /api/exception_lists/_bulk_action
Then the response status is 401
```
