/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { estypes } from '@elastic/elasticsearch';
import {
  buildExistsClause,
  buildMatchAnyClause,
  buildMatchClause,
  buildMatchWildcardClause,
} from '@kbn/lists-plugin/server/services/exception_lists';
import { buildExceptionEntriesFilterStepCommonDefinition } from '../../../../common/workflows/step_types/build_exception_entries_filter_step/build_exception_entries_filter_step_common';

type ProposedEntry =
  | { field: string; operator: 'is' | 'is_not' | 'matches' | 'does_not_match'; value: string }
  | { field: string; operator: 'is_one_of' | 'is_not_one_of'; values: string[] }
  | { field: string; operator: 'exists' | 'does_not_exist' };

// Maps the workflow's analyst-facing exception_entries vocabulary (the shape diagnose_rule's
// schema in rule_tuning_review.yaml already returns) onto the type/operator pairs the
// exceptions system's own clause builders expect, so this step can reuse them instead of
// reimplementing glob and array matching.
// Explicit field-by-field construction, not `{ ...entry, operator: 'included' }`: entry's own
// `operator` is still the workflow vocabulary (`is_not`, `does_not_match`, ...), and spreading
// it after (or before, unordered) a literal `operator` risks the wrong one winning.
const buildClause = (entry: ProposedEntry): estypes.QueryDslQueryContainer => {
  switch (entry.operator) {
    case 'is':
      return buildMatchClause({
        type: 'match',
        operator: 'included',
        field: entry.field,
        value: entry.value,
      });
    case 'is_not':
      return buildMatchClause({
        type: 'match',
        operator: 'excluded',
        field: entry.field,
        value: entry.value,
      });
    case 'matches':
      return buildMatchWildcardClause({
        type: 'wildcard',
        operator: 'included',
        field: entry.field,
        value: entry.value,
      });
    case 'does_not_match':
      return buildMatchWildcardClause({
        type: 'wildcard',
        operator: 'excluded',
        field: entry.field,
        value: entry.value,
      });
    case 'is_one_of':
      return buildMatchAnyClause({
        type: 'match_any',
        operator: 'included',
        field: entry.field,
        value: entry.values,
      });
    case 'is_not_one_of':
      return buildMatchAnyClause({
        type: 'match_any',
        operator: 'excluded',
        field: entry.field,
        value: entry.values,
      });
    case 'exists':
      return buildExistsClause({ type: 'exists', operator: 'included', field: entry.field });
    case 'does_not_exist':
      return buildExistsClause({ type: 'exists', operator: 'excluded', field: entry.field });
  }
};

export const buildExceptionEntriesFilterStepDefinition = createServerStepDefinition({
  ...buildExceptionEntriesFilterStepCommonDefinition,
  handler: async (context) => {
    // zod `.default([])` doesn't apply at runtime; see set_alert_tags_step's handler for why.
    const { entries, existing_filters: existingFilters = [] } = context.input;
    const clauses = entries.map((entry) => buildClause(entry as ProposedEntry));

    // bool.filter ANDs its clauses, matching how one exception item's entries all must
    // match for the exception to apply; the outer must_not excludes alerts that would
    // match, i.e. what the rule would produce with the exception in place.
    const negatedFilter = { bool: { must_not: { bool: { filter: clauses } } } };

    return { output: { filters: [...existingFilters, negatedFilter] } };
  },
});
