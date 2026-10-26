/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectMetadataId } from '@kbn/securitysolution-utils';
import type { IRuleExecutionLogForExecutors } from '../../../rule_monitoring';
import { validateEsqlQuery } from './validate_esql_query';

export interface TransformedQueryResult {
  query: string;
  injectionFailureReason?: string;
}

/**
 * Returns a transformed ES|QL query with `METADATA _id` injected (for deduplication).
 * Validates the transformation via AST before using it.
 * Aggregating queries are returned unchanged — they don't produce document-level alerts.
 */
export const getTransformedQuery = async ({
  originalQuery,
  ruleExecutionLogger,
  isAggregating,
}: {
  originalQuery: string;
  ruleExecutionLogger: IRuleExecutionLogForExecutors;
  isAggregating: boolean;
}): Promise<TransformedQueryResult> => {
  if (isAggregating) {
    return { query: originalQuery };
  }

  let candidateQuery: string;
  try {
    candidateQuery = injectMetadataId(originalQuery);
  } catch (error) {
    ruleExecutionLogger.warn(
      `Failed to inject METADATA _id into ES|QL query: ${error?.message}. Using original query.`
    );
    return {
      query: originalQuery,
      injectionFailureReason: error?.message ?? 'Unknown error',
    };
  }

  if (candidateQuery === originalQuery) {
    return { query: originalQuery };
  }

  const isValid = await validateEsqlQuery({
    query: candidateQuery,
    ruleExecutionLogger,
  });

  if (isValid) {
    ruleExecutionLogger.trace('Transformed ES|QL query validated');
    return { query: candidateQuery };
  }

  return {
    query: originalQuery,
    injectionFailureReason: 'Transformed query failed ES|QL validation',
  };
};
