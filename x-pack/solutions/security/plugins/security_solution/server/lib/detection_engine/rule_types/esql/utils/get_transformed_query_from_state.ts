/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { computeIsESQLQueryAggregating, injectMetadataId } from '@kbn/securitysolution-utils';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import type { EsqlState } from '../types';
import { validateEsqlQuery } from './validate_esql_query';

/**
 * Returns a transformed ES|QL query with `METADATA _id` injected (for deduplication).
 * Uses state-based caching to avoid re-transforming and re-validating on every execution.
 * On cache miss, validates the transformation via AST before using it.
 * Aggregating queries are returned unchanged — they don't produce document-level alerts.
 */
export const getTransformedQueryFromState = async ({
  originalQuery,
  state,
  ruleExecutionLogger,
}: {
  originalQuery: string;
  state: EsqlState;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
}): Promise<string> => {
  if (computeIsESQLQueryAggregating(originalQuery)) {
    return originalQuery;
  }

  if (state.lastQuery === originalQuery && state.transformedQuery != null) {
    ruleExecutionLogger.trace('Using state-based transformed ES|QL query');
    return state.transformedQuery;
  }

  let candidateQuery: string;
  try {
    candidateQuery = injectMetadataId(originalQuery);
  } catch (error) {
    ruleExecutionLogger.warn(
      `Failed to inject METADATA _id into ES|QL query: ${error?.message}. Using original query.`
    );
    return originalQuery;
  }

  if (candidateQuery === originalQuery) {
    return originalQuery;
  }

  const isValid = await validateEsqlQuery({
    query: candidateQuery,
    ruleExecutionLogger,
  });

  if (isValid) {
    ruleExecutionLogger.trace('Transformed ES|QL query validated');
    return candidateQuery;
  }

  return originalQuery;
};
