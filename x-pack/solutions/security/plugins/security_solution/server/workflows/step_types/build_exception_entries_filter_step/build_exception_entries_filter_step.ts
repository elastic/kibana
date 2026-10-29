/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { estypes } from '@elastic/elasticsearch';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import {
  buildExistsClause,
  buildMatchAnyClause,
  buildMatchClause,
  buildMatchWildcardClause,
} from '@kbn/lists-plugin/server/services/exception_lists';
import { buildExceptionEntriesFilterStepCommonDefinition } from '../../../../common/workflows/step_types/build_exception_entries_filter_step/build_exception_entries_filter_step_common';
import { toApiEntries } from '../../utils/exception_item';

// Dispatches each API entry to the same clause builder the detection engine's own
// exception evaluation uses, so the backtested filter matches exactly what the
// created exception would suppress.
const buildClause = (entry: EntriesArray[number]): estypes.QueryDslQueryContainer => {
  switch (entry.type) {
    case 'match':
      return buildMatchClause(entry);
    case 'match_any':
      return buildMatchAnyClause(entry);
    case 'wildcard':
      return buildMatchWildcardClause(entry);
    case 'exists':
      return buildExistsClause(entry);
    default:
      throw new ExecutionError({
        type: 'ValidationError',
        message: `Unsupported exception entry type "${entry.type}" for filter building`,
      });
  }
};

export const buildExceptionEntriesFilterStepDefinition = createServerStepDefinition({
  ...buildExceptionEntriesFilterStepCommonDefinition,
  handler: async (context) => {
    // The engine renders `context.input` from the `with` block without running
    // inputSchema.parse(), so parse here: it applies defaults, rejects unknown
    // operators and empty `entries` (which would otherwise build a filter that
    // excludes every document), and narrows the entry types for toApiEntries.
    const parsed = buildExceptionEntriesFilterStepCommonDefinition.inputSchema.safeParse(
      context.input
    );
    if (!parsed.success) {
      throw new ExecutionError({ type: 'ValidationError', message: parsed.error.message });
    }
    const { entries, existing_filters: existingFilters } = parsed.data;

    const clauses = toApiEntries(entries).map(buildClause);

    // bool.filter ANDs its clauses, matching how one exception item's entries all must
    // match for the exception to apply; the outer must_not excludes alerts that would
    // match, i.e. what the rule would produce with the exception in place.
    const negatedFilter = { bool: { must_not: { bool: { filter: clauses } } } };

    return { output: { filters: [...existingFilters, negatedFilter] } };
  },
});
