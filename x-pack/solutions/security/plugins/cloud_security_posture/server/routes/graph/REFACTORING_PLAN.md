# ESQL Graph Query Builder Refactoring Plan

## Overview

This document describes the refactoring of the ESQL query building logic in `fetch_graph.ts` into a modular, maintainable structure in `esql_graph_query_builder.ts`.

## Objectives

1. **Maintainability**: Split 180+ line template string into logical, cohesive sections
2. **Readability**: Make branching logic visible at the top level, not buried in helper functions
3. **Balance**: Avoid over-fragmentation (too many tiny functions) while maintaining clarity
4. **Type Safety**: Preserve TypeScript type checking and comprehensive test coverage

## Architecture Decisions

### Why NOT Use `esql` Tagged Template Helper?

We initially attempted to use the `esql` helper from `@kbn/esql-ast` but discovered:

**The Issue:**

```typescript
// ❌ This FAILS - esql helper quotes/escapes interpolated ESQL fragments
const query = esql`
  FROM ${indexPatterns.join(',')}
  ${buildEnrichedEntitySection()} // This gets quoted as a string literal!
`;
// Result: SyntaxError: mismatched input '"ENRICH..."' expecting <EOF>
```

**Why It Fails:**

- The `esql` helper is designed for **VALUE interpolation**, not ESQL code fragments
- The `{{ }}` syntax in documentation is for interpolating VALUES into queries, not multi-line ESQL fragments
- When you interpolate a string containing ESQL commands, it gets quoted/escaped incorrectly

**Our Solution:**

- Use plain string composition with template literals
- Still maintain type safety via TypeScript interfaces
- Comprehensive test coverage (14 tests) validates query correctness
- Future-proofing: If ESQL Composer API adds fragment composition support, easy to migrate

### Function Design Principles

**Core Principle: Visibility of Branching Logic**

```typescript
// ✅ CORRECT - Branching visible at top level
export function buildGraphQuery(params) {
  // ALL if/else decisions HERE
  const enrichmentSection = isEnrichPolicyExists
    ? buildEnrichedEntitySection(policyName)
    : buildNonEnrichedEntitySection();

  const alertRuleField = alertsMappingsIncluded ? buildAlertRuleNameField() : '';

  // Build query using plain template strings
  return `FROM ... ${enrichmentSection} ... ${alertRuleField} ...`;
}

// ✅ CORRECT - Helper has ZERO conditionals
function buildEnrichedEntitySection(policyName: string): string {
  return `
| ENRICH ${policyName} ON actor.entity.id ...
| EVAL actorDocData = CONCAT(...
  `;
}

// ❌ WRONG - Branching hidden inside helper
function buildEntitySection(isEnriched: boolean, policyName: string) {
  if (isEnriched) {
    return buildEnrichedVersion(policyName);
  } else {
    return buildNonEnrichedVersion();
  }
}
```

**Why This Matters:**

- Reader sees ALL branching logic in main function
- Helper functions are "dead simple" - just return ESQL fragments
- No nested conditionals to track
- Easy to understand query flow at a glance

## Implementation Structure

### 6 Helper Functions (Dead Simple, No Branching)

1. **`buildEnrichedEntitySection(policyName)`**

   - Returns: ENRICH commands + entity data EVALs
   - Used when: Entity enrichment policy exists
   - NO conditionals inside

2. **`buildNonEnrichedEntitySection()`**

   - Returns: Null fallback EVALs for entity fields
   - Used when: No enrichment policy available
   - NO conditionals inside

3. **`buildEntityGroupSection()`**

   - Returns: Entity group EVALs for aggregation
   - Combines type + sub-type, or uses placeholder
   - NO conditionals inside

4. **`buildStatsSection()`**

   - Returns: STATS aggregation command
   - Heart of the query - aggregates events by action, entities, origin
   - NO conditionals inside

5. **`buildPostAggregationSection()`**

   - Returns: Post-STATS transformations
   - Updates entity types, labels, calculates counts
   - NO conditionals inside

6. **`buildAlertRuleNameField()`**
   - Returns: Alert rule name field fragment for document data
   - Used when: Alert mappings are included
   - NO conditionals inside

### 1 Main Function (All Branching Visible)

**`buildGraphQuery(params)`**

- **Purpose**: Orchestrate query construction with ALL branching visible
- **Branching Logic:**

  1. Choose enrichment strategy (enriched vs non-enriched)
  2. Choose alert field inclusion (with or without rule name)
  3. Build origin event conditions (based on array lengths)

- **Structure:**

```typescript
export function buildGraphQuery(params: GraphQueryParams) {
  // ===== ALL BRANCHING HERE =====
  const enrichmentSection = isEnrichPolicyExists
    ? buildEnrichedEntitySection(enrichPolicyName)
    : buildNonEnrichedEntitySection();

  const alertRuleField = alertsMappingsIncluded ? buildAlertRuleNameField() : '';

  const originEventCondition = originEventIds.length > 0 ? `event.id in (...)` : 'false';

  // ===== BUILD QUERY =====
  const query = `
    FROM ${indexPatterns.join(',')} METADATA _id, _index
    | WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL
    ${enrichmentSection}

    | EVAL sourceIps = source.ip
    | EVAL sourceCountryCodes = source.geo.country_iso_code

    | EVAL isOrigin = ${originEventCondition}
    | EVAL isOriginAlert = isOrigin AND ${originAlertCondition}

    | EVAL isAlert = _index LIKE "*${securityAlertsIdentifier}*"
    | EVAL docData = CONCAT("{", ... ${alertRuleField} "}")

    ${buildEntityGroupSection()}
    ${buildStatsSection()}
    ${buildPostAggregationSection()}

    | LIMIT 1000
    | SORT action DESC, actorEntityGroup, targetEntityGroup, isOrigin
  `;

  return { query };
}
```

## Query Structure (ESQL Pipeline Flow)

```
1. SOURCE & FILTERING
   FROM ${indexPatterns} METADATA _id, _index
   | WHERE event.action IS NOT NULL AND actor.entity.id IS NOT NULL

2. ENTITY ENRICHMENT (Conditional)
   IF enrichment exists:
     | ENRICH ${policyName} ON actor.entity.id ...
     | ENRICH ${policyName} ON target.entity.id ...
     | EVAL actorDocData = CONCAT(...)
     | EVAL targetDocData = CONCAT(...)
   ELSE:
     | EVAL actorEntityType = TO_STRING(null)
     | EVAL targetEntityType = TO_STRING(null)
     ... (all enrichment fields set to null)

3. FIELD MAPPING
   | EVAL sourceIps = source.ip
   | EVAL sourceCountryCodes = source.geo.country_iso_code

4. ORIGIN IDENTIFICATION
   | EVAL isOrigin = ${originEventCondition}
   | EVAL isOriginAlert = isOrigin AND ${originAlertCondition}

5. DOCUMENT METADATA
   | EVAL isAlert = _index LIKE "*${securityAlertsIdentifier}*"
   | EVAL docType = CASE (isAlert, "alert", "event")
   | EVAL docData = CONCAT("{", ... ${alertRuleField} "}")

6. ENTITY GROUPING
   | EVAL actorEntityGroup = CASE(...)
   | EVAL targetEntityGroup = CASE(...)

7. AGGREGATION (STATS)
   | STATS badge = COUNT(*),
     totalEventsCount = COUNT_DISTINCT(event.id),
     ... (20+ aggregated fields)
     BY action, actorEntityGroup, targetEntityGroup, isOrigin, isOriginAlert

8. POST-AGGREGATION
   | EVAL actorEntityType = CASE(...)   // Update types based on enrichment
   | EVAL targetEntityType = CASE(...)
   | EVAL actorLabel = CASE(...)        // Determine labels
   | EVAL targetLabel = CASE(...)
   | EVAL uniqueEventsCount = totalEventsCount - uniqueAlertsCount

9. RESULT LIMITING
   | LIMIT 1000
   | SORT action DESC, actorEntityGroup, targetEntityGroup, isOrigin
```

## Benefits of This Approach

### ✅ Maintainability

- Each helper focuses on ONE query phase
- Logical grouping: enrichment, grouping, aggregation, post-processing
- Easy to locate and modify specific query logic

### ✅ Readability

- Main function shows complete query flow
- All branching decisions visible at top level
- Helper functions are self-documenting (names describe what they return)

### ✅ Balance

- 6 helpers (not 16!) - cohesive sections, not over-fragmented
- Each helper is substantial enough to be meaningful
- Not so many that you lose track of the flow

### ✅ Testing

- All 14 existing tests pass without modification
- Test coverage validates:
  - Query syntax correctness
  - Enrichment logic (with/without policy)
  - Origin event handling
  - Non-enriched entity handling
  - Event/alert counting logic

### ✅ Type Safety

- TypeScript enforces parameter types via `GraphQueryParams` interface
- No `any`, `unknown`, `@ts-ignore`, or `@ts-expect-error` needed
- Compiler catches type errors before runtime

## Lessons Learned

1. **ESQL Composer API Limitations**: The `esql` helper is for VALUE interpolation, not code fragment composition. Attempting to interpolate ESQL fragments results in syntax errors.

2. **Balancing Act**: Too many functions (16) = fragmented, hard to follow. Too few (1) = monolithic, hard to maintain. Sweet spot: 6 helpers + 1 main function.

3. **Visibility > Abstraction**: Hiding branching logic inside helpers makes code harder to understand. Keep all if/else decisions in the main function.

4. **Dead Simple Helpers**: Helper functions with ZERO conditionals are easier to test, understand, and maintain. Let the main function handle all logic.

5. **String Composition Works**: Plain template strings are perfectly fine for ESQL query building when combined with TypeScript type safety and comprehensive tests.

## Verification Results

✅ **Tests**: 14/14 passing

```bash
yarn test:jest fetch_graph.test.ts
# PASS - 14 passed, 14 total
```

✅ **Linting**: 0 errors

```bash
node scripts/eslint --fix esql_graph_query_builder.ts fetch_graph.ts
# ✅ no eslint errors found
```

✅ **Type Checking**: 0 errors

```bash
node scripts/type_check --project cloud_security_posture/tsconfig.json
# [tsc] exited with 0 after 13.6 seconds
```

## Future Considerations

If the ESQL Composer API adds support for composing ESQL fragments (not just values), we can revisit using it. Until then, plain string composition with TypeScript type safety provides the best balance of:

- Correctness (validated by tests)
- Readability (visible structure)
- Maintainability (logical sections)
- Type safety (TypeScript interfaces)
