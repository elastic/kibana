# Test Plan: Native ES|QL exceptions

> ⚠️ Generated without a GitHub issue. This plan was produced from the branch `exceptions-in-esql-poc`: the design doc `esql_exceptions_proposal.md` and the implementation in `build_esql_native_exceptions.ts` / `esql.ts`. Acceptance Criteria are derived from the proposal, not copied from an issue. The Issue Clarity Assessment section is marked N/A for the same reason. Re-run the test-plan-generator skill against the tracking issue once one exists.

## Overview

This test plan covers compiling detection exception items directly into an ES|QL rule's query, instead of applying them only as a DSL pre-filter. Each exception item becomes a `WHERE NOT (...)` stage placed either early (right after `FROM`, for fields present in the source indices) or late (after the pipeline, for computed columns). The predicates reproduce the Lucene semantics of today's exception filter, including any-element matching on multi-valued fields. The expected outcome is that an ES|QL rule with exceptions produces the same alerts as today for single-valued fields, reaches parity on multi-valued fields, and additionally supports exceptions on aggregated / computed columns that the DSL pre-filter cannot reference. Scope is the ES|QL rule type (`siem.esqlRule`) in the current detection engine, behind the POC name marker `POC EXCEPTIONS`.

## Feature Background

Exceptions on an ES|QL rule are applied today as a DSL filter on the source documents, before the rule's pipeline. That cannot reference a column the pipeline computes (a `STATS` output, an `EVAL` field, a rename), and for aggregating rules it changes the aggregation rather than suppressing the resulting alert. Compiling the exceptions into the query fixes both: source-field exceptions filter events before aggregation (event-level), and computed-column exceptions suppress the alert row (alert-level). Value lists are deliberately left on the existing implementation for this delivery.

## Scope

**In scope:**
- Compiling `match`, `match_any`, `exists`, and `wildcard` entries (both `included` and `excluded`) into ES|QL predicates.
- Multi-valued field parity with the Lucene path via `MV_CONTAINS` (equality family), `IS NULL` / `IS NOT NULL` (`exists`), and `QSTR` (wildcard).
- Placement: source-field items early (after `FROM`), computed-column items late (after the pipeline), and items referencing a field in neither position reported as not-applied.
- Literal typing / casting for `MV_CONTAINS`, and query-string escaping for `QSTR`.
- Routing value-list (`list`) items to the existing DSL implementation with no double-apply, and the schema-probe-failure fallback to the DSL path.
- End-to-end alert parity between the native path and the current DSL path for an ES|QL rule.

**Out of scope:**
- Value lists compiled into the query — routed to the existing DSL implementation for this delivery; separate design.
- Nested exception entries — no native ES|QL representation; reported as not-applied.
- Upgrade / migration scenarios — no upgrade surface (runtime query compilation; no persisted state, schema, saved objects, config, or navigation changes).
- Other rule types (query, EQL, threshold, new terms, indicator match) — this change is gated to the ES|QL rule type.
- The `POC EXCEPTIONS` name marker itself — a POC gate, replaced by a feature flag before delivery.

## Terminology

| Term | Definition |
|---|---|
| Early position | A `WHERE NOT (...)` stage inserted right after the `FROM` source command; filters source documents before the pipeline (event-level exclusion). |
| Late position | A `WHERE NOT (...)` stage appended after the whole rule pipeline; suppresses an output/alert row (alert-level exclusion). |
| Any-element matching | Lucene semantics where a query matches a multi-valued field if any one element matches. `MV_CONTAINS` / `QSTR` reproduce this; `==` / `IN` / `LIKE` return `null` on a multi-valued field and do not. |
| Schema probe | A `... | LIMIT 0` request that returns column names and types (no rows), run once on the `FROM` clause (source columns) and once on the full query (output columns). |

## Assumptions

- **License level:** whatever the ES|QL rule type already requires; this change adds no license surface.
- **User role:** rule executes server-side under the rule's API key; no additional end-user role applies.
- **Data setup:** a source index with the fields under test, plus documents that should and should not be excluded; an ES|QL rule tagged with `POC EXCEPTIONS` and an exception list attached.
- **Deployment type:** applies equally to self-managed, serverless, and ECH — the compiler is a pure function and the executor change is deployment-agnostic.
- **Target version:** N/A — runtime query compilation has no upgrade surface (see *Out of scope*).
- **Elasticsearch:** behaviors that depend on ES|QL functions (`MV_CONTAINS`, `QSTR`, full-text placement) were verified on ES 9.6.0-SNAPSHOT.

## Acceptance Criteria

Derived from `esql_exceptions_proposal.md`:

1. `match` / `match_any` compile to `MV_CONTAINS` (with the literal cast to the column type), `exists` to `IS NULL` / `IS NOT NULL`, `wildcard` to `QSTR` at the early position, and the `excluded` operator negates the predicate.
2. On a multi-valued field, `match` / `match_any` / `wildcard` exclude an alert when any element matches (parity with the Lucene path); an absent field is treated as not-matched and the alert is kept.
3. An item whose fields are all present in the source indices is inlined early (after `FROM`); an item referencing a computed column is appended late (after the pipeline); a field present in both positions prefers early.
4. An item referencing a field in neither the source nor the output is not applied and is reported as a warning; nested and value-list items are likewise not compiled.
5. Value-list items are applied by the existing DSL implementation, and no item is applied twice.
6. If a schema probe fails, the executor applies all items via the existing DSL path (no exceptions are silently dropped).
7. For single-valued fields, the native path produces the same alerts as the current DSL path.
8. The original rule query text is preserved; only the exclusion stages are inserted.

## Known Limitations

- ⚠️ No GitHub issue or merged PR backs this plan; it is derived from the proposal doc and the POC implementation on `exceptions-in-esql-poc`. Symbol names, warning strings, and the eventual feature-flag name should be re-confirmed when the implementation PR is opened.
- ⚠️ `wildcard` on a **computed** column cannot use `QSTR` (full-text functions are rejected after `STATS` / `EVAL`) and falls back to `LIKE`, which loses any-element matching on a multi-valued value. A computed column is not multi-valued in practice, so this residual is accepted rather than covered as a parity scenario.
- ⚠️ End-to-end parity scenarios (areas D and E) have no automated coverage in CI. They are exercised today only by the manual POC scripts (`poc_ab_compare.mjs`, `poc_esql_exceptions.mjs`) against a local stack; they need Jest-integration or FTR/Scout coverage before delivery.
- Optional sections (RBAC, Multi-space, Multi-tenant, CCS) do not apply: no user-facing surface, no persisted state, no space/tenant scoping added, and no new cross-cluster behavior. Upgrade is recorded under *Out of scope* per the always-evaluated rule — no upgrade surface.

## Test Scenarios

<details>
<summary><strong>Entry-type compilation</strong> — 5 scenarios (P0: 3, P1: 2, P2: 0)</summary>

#### Scenario: `match` and `match_any` compile to `MV_CONTAINS` with the literal cast to the column type

**Priority:** P0

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — the "source-field items are inlined early" matrix covers `match`/`match_any` across keyword, long, double, boolean, unsigned_long, ip, and date, asserting the cast (e.g. `42::long`, `"10.0.0.1"::ip`, `"2025-01-01T00:00:00.000Z"::date`).
```gherkin
Given an exception with a match entry on a keyword field and another on a long field
When the query is compiled
Then the keyword predicate is MV_CONTAINS(field, "value") and the long predicate is MV_CONTAINS(field, 42::long)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: `exists` compiles to `IS NOT NULL` and `IS NULL` for included / excluded

**Priority:** P0

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — "exists / included" and "exists / excluded" matrix cases.
```gherkin
Given an exists entry on a field
When the query is compiled with operator included, then again with operator excluded
Then the predicates are "field IS NOT NULL" and "field IS NULL" respectively
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: `wildcard` compiles to `QSTR` at the early position with query-string escaping

**Priority:** P0

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — "wildcard / included (QSTR, early)", "wildcard / excluded (QSTR, early)", and the special-character escaping case (`a b:c*` → `QSTR("url.original:a\\ b\\:c*")`).
```gherkin
Given a wildcard entry with value "http*" on a source keyword field
When the query is compiled
Then the predicate is QSTR("url.original:http*") and the * is preserved while other query-string metacharacters are escaped
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: the `excluded` operator negates the entry predicate

**Priority:** P1

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — the excluded matrix cases (`NOT MV_CONTAINS(...)`, `NOT (... OR ...)`, `NOT QSTR(...)`).
```gherkin
Given a match entry with operator excluded on a keyword field
When the query is compiled
Then the predicate is "NOT MV_CONTAINS(field, "value")"
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a value with quotes and backslashes is escaped for the ES|QL string literal

**Priority:** P1

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "match / included / value with quotes and backslashes (escaped)" (`a"b\c` → `MV_CONTAINS(message, "a\"b\\c")`).
```gherkin
Given a match entry whose value contains a double quote and a backslash
When the query is compiled
Then the emitted literal escapes both so the resulting ES|QL parses
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Multi-valued field parity</strong> — 5 scenarios (P0: 3, P1: 1, P2: 1)</summary>

#### Scenario: `match` on a multi-valued field excludes the alert when any element matches

**Priority:** P0

**Automation coverage**: No existing CI test; verified manually on ES 9.6.0-SNAPSHOT (`MV_CONTAINS(kw, "a")` excludes a document whose `kw` is `["a", "b"]`). Needs Jest-integration or FTR coverage.
```gherkin
Given a document whose keyword field holds ["evil.com", "good.com"]
And an included match exception on that field for "evil.com"
When the ES|QL rule runs with native exceptions
Then no alert is produced for that document (same as the current DSL path)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: `wildcard` on a multi-valued source field matches any element via `QSTR`

**Priority:** P0

**Automation coverage**: No existing CI test; verified manually on ES 9.6.0-SNAPSHOT (`QSTR("kw:a*")` excludes `["a","b"]`, keeps `["c"]`). Needs FTR/integration coverage.
```gherkin
Given a document whose field holds ["alpha", "beta"]
And an included wildcard exception "al*" on that source field
When the rule runs with native exceptions
Then no alert is produced for that document
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: an absent / null field is treated as not-matched and the alert is kept

**Priority:** P0

**Automation coverage**: No existing CI test; verified manually (`MV_CONTAINS(field, "x")` returns false on an absent field, so the row survives). Needs integration coverage.
```gherkin
Given a document that does not have the exception field at all
And an included match exception on that field
When the rule runs with native exceptions
Then the alert is still produced (the exception does not suppress it)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: `exists` evaluates correctly on a multi-valued field

**Priority:** P1

**Automation coverage**: No existing CI test; `IS NOT NULL` is known to evaluate on multi-valued fields. Needs integration coverage.
```gherkin
Given a document whose field holds two values
And an included exists exception on that field
When the rule runs with native exceptions
Then the alert is suppressed (the field exists)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: `wildcard` on a computed column falls back to `LIKE` (documented residual)

**Priority:** P2

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "wildcard on a computed column falls back to LIKE at the end (QSTR cannot follow STATS)".
```gherkin
Given a wildcard exception on a column produced by STATS
When the query is compiled
Then the late predicate is COALESCE(column LIKE "pattern", false) rather than QSTR
And this is documented as single-valued-only (computed columns are not multi-valued)
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Placement</strong> — 5 scenarios (P0: 2, P1: 2, P2: 1)</summary>

#### Scenario: a source-field item is inlined early, right after FROM

**Priority:** P0

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — the early matrix asserts full queries of the form `FROM ...\n| WHERE NOT (...) | WHERE ...`.
```gherkin
Given an exception on a field present in the source indices
When the query is compiled
Then a WHERE NOT (...) stage is inserted immediately after the FROM command, before the rest of the pipeline
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a computed-column item is appended late, after the pipeline

**Priority:** P0

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "match on a computed column uses MV_CONTAINS at the end".
```gherkin
Given an exception on a column produced by STATS (e.g. count)
When the query is compiled
Then a WHERE NOT (...) stage is appended after the final pipeline stage
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a field present in both source and output prefers the early position

**Priority:** P1

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "prefers the early position for a field present in both source and output".
```gherkin
Given an exception on a STATS ... BY grouping key that is also a source field
When the query is compiled
Then the exclusion is inserted early (before STATS), not appended late
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a rule with one source-field item and one computed-column item gets both an early and a late stage

**Priority:** P1

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "inserts an early and a late stage for one rule with both kinds of item".
```gherkin
Given two exception items, one on a source field and one on a computed column
When the query is compiled
Then an early WHERE NOT (...) is inserted after FROM and a late WHERE NOT (...) is appended at the end
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: the original rule query text is preserved; only the exclusion stages are added

**Priority:** P2

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — every early/late case asserts the full query, showing the original text unchanged around the inserted stage.
```gherkin
Given any rule query
When one or more exceptions are compiled in
Then the original query characters are unchanged and only "\n| WHERE NOT (...)" stages are inserted
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Not-applied items and reporting</strong> — 4 scenarios (P0: 1, P1: 2, P2: 1)</summary>

#### Scenario: an item whose field is in neither source nor output is reported, query unchanged

**Priority:** P0

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — "skips the whole item when any one of its fields is in neither position" and the per-matrix "skipped when the field is in neither" cases.
```gherkin
Given an exception on a field that is neither a source field nor a query output column
When the query is compiled
Then the query is returned unchanged and the item is reported as skipped with a reason
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a skipped item surfaces as a rule execution warning

**Priority:** P1

**Automation coverage**: No existing CI test for the executor path; the compiler returns the skipped list and `esql.ts` pushes a warning message. Needs executor-level coverage.
```gherkin
Given an exception item that cannot be applied
When the ES|QL rule executes
Then a warning listing the item and reason appears in the rule execution results
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: nested entries are not compiled and are reported

**Priority:** P1

**Automation coverage**: Unit test (Jest) in `build_esql_native_exceptions.test.ts` — "reports nested entries".
```gherkin
Given an exception item containing a nested entry
When the query is compiled
Then the item is not compiled and is reported with reason "nested entries have no native ES|QL path"
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: within an item, entries are AND-ed and items are OR-ed

**Priority:** P2

**Automation coverage**: Unit tests (Jest) in `build_esql_native_exceptions.test.ts` — "AND-s the entries within a single item" and "OR-s separate items".
```gherkin
Given one item with two entries and a separate second item
When the query is compiled
Then the two entries are joined with AND and the two items are joined with OR under a single NOT
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

</details>

---

<details>
<summary><strong>Value-list routing, fallback, and end-to-end execution</strong> — 5 scenarios (P0: 3, P1: 1, P2: 1)</summary>

#### Scenario: value-list items are applied by the existing DSL implementation, not compiled into the query

**Priority:** P0

**Automation coverage**: No existing CI test for the executor split; verified via the manual POC scripts. Needs executor-level coverage.
```gherkin
Given an exception list with a scalar item and a value-list item
When the ES|QL rule executes with native exceptions
Then the scalar item is compiled into the query and the value-list item is applied through the DSL exception filter
And neither item is applied twice
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: a schema-probe failure falls back to the DSL path for all items

**Priority:** P0

**Automation coverage**: No existing CI test; the executor catches probe errors and keeps the full DSL filter. Needs executor-level coverage.
```gherkin
Given the source or output schema probe fails
When the ES|QL rule executes
Then all exception items are applied via the existing DSL exception filter and none are dropped
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: single-valued fields produce the same alerts as the current DSL path (A/B parity)

**Priority:** P0

**Automation coverage**: Manual only — `poc_ab_compare.mjs` previews each rule through the DSL path and the native path and diffs survivors. Needs FTR/Scout automation.
```gherkin
Given the same rule and exception on a single-valued field
When previewed through the DSL path and through the native path
Then both produce the identical set of alerts
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: an exception on a source field on an aggregating rule removes events before aggregation (event-level)

**Priority:** P1

**Automation coverage**: Manual only; verified conceptually and via live `_query`. Needs integration coverage.
```gherkin
Given an aggregating rule (STATS ... BY) and an exception on a source field
When the rule runs with native exceptions
Then the excepted events are removed before the aggregation, changing the aggregate as intended
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

#### Scenario: an exception on a computed column suppresses only that alert row (alert-level)

**Priority:** P2

**Automation coverage**: Manual only; the late-position unit test covers compilation, not execution. Needs integration coverage.
```gherkin
Given an aggregating rule and an exception on a computed column (e.g. count == 101)
When the rule runs with native exceptions
Then only the matching alert row is suppressed and other groups' values are unchanged
```

**Execution:**
- [ ] ✅ Pass
- [ ] ❌ Fail
- [ ] 🚫 Blocked

_If Fail or Blocked, reply with details (env, build, repro steps)._

</details>

---

## Test Coverage Summary

**Total scenarios:** 24

| Feature area | Scenarios | P0 | P1 | P2 | Automated | Manual only |
|---|---|---|---|---|---|---|
| Entry-type compilation | 5 | 3 | 2 | 0 | 5 (unit) | 0 |
| Multi-valued field parity | 5 | 3 | 1 | 1 | 1 (unit) | 4 |
| Placement | 5 | 2 | 2 | 1 | 5 (unit) | 0 |
| Not-applied items and reporting | 4 | 1 | 2 | 1 | 3 (unit) | 1 |
| Value-list routing, fallback, and end-to-end execution | 5 | 3 | 1 | 1 | 0 | 5 |
| **Total** | **24** | **12** | **8** | **4** | **14** | **10** |

**Automated coverage notes:**
- Unit tests (Jest): `x-pack/solutions/security/plugins/security_solution/server/lib/detection_engine/rule_types/esql/utils/build_esql_native_exceptions.test.ts` (49 tests) cover the compiler: entry-type compilation and casts, `excluded` negation, escaping, early/late placement, the placement decision, boolean structure, not-applied reporting, and `getFromClause`.
- Existing executor suite `esql/esql.test.ts` (7 tests) does not exercise the native-exceptions path (it is behind the `POC EXCEPTIONS` name marker).
- Gaps: no executor-level tests for the value-list DSL split, probe-failure fallback, or skipped-item warning; no Jest-integration / FTR / Scout tests for end-to-end alert parity or multi-valued execution. Multi-valued parity and A/B parity are exercised today only by the manual POC scripts (`poc_ab_compare.mjs`, `poc_esql_exceptions.mjs`) against a local stack.

## Test Execution Notes

**P0 — run first, block release if failing:**
- `match` and `match_any` compile to `MV_CONTAINS` with the literal cast to the column type
- `exists` compiles to `IS NOT NULL` and `IS NULL` for included / excluded
- `wildcard` compiles to `QSTR` at the early position with query-string escaping
- `match` on a multi-valued field excludes the alert when any element matches
- `wildcard` on a multi-valued source field matches any element via `QSTR`
- an absent / null field is treated as not-matched and the alert is kept
- a source-field item is inlined early, right after FROM
- a computed-column item is appended late, after the pipeline
- an item whose field is in neither source nor output is reported, query unchanged
- value-list items are applied by the existing DSL implementation, not compiled into the query
- a schema-probe failure falls back to the DSL path for all items
- single-valued fields produce the same alerts as the current DSL path (A/B parity)

**P1 — run before release, high-impact regressions:**
- the `excluded` operator negates the entry predicate
- a value with quotes and backslashes is escaped for the ES|QL string literal
- `exists` evaluates correctly on a multi-valued field
- a field present in both source and output prefers the early position
- a rule with one source-field item and one computed-column item gets both an early and a late stage
- a skipped item surfaces as a rule execution warning
- nested entries are not compiled and are reported
- an exception on a source field on an aggregating rule removes events before aggregation (event-level)

**P2 — run as capacity allows, limited blast radius:**
- `wildcard` on a computed column falls back to `LIKE` (documented residual)
- the original rule query text is preserved; only the exclusion stages are added
- within an item, entries are AND-ed and items are OR-ed
- an exception on a computed column suppresses only that alert row (alert-level)

---

<details>
<summary>📊 Issue Clarity Assessment</summary>

N/A — this plan was not generated from a GitHub issue. It was derived from the design doc `esql_exceptions_proposal.md` and the POC implementation on the `exceptions-in-esql-poc` branch. Run the assessment when a tracking issue exists.

</details>

---

*🤖 Generated by claude-opus-4-8 on 2026-09-30*
