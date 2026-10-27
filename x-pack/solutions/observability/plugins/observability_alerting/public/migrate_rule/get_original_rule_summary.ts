/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type OriginalRuleQueryLanguage = 'esql' | 'dsl' | 'kql' | 'lucene';

export interface OriginalRuleQuery {
  language: OriginalRuleQueryLanguage;
  query: string;
}

export interface OriginalRuleSummary {
  query?: OriginalRuleQuery;
  timeField?: string;
  timeWindow?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getQuery = (params: Record<string, unknown>): OriginalRuleQuery | undefined => {
  const { searchType, esqlQuery, esQuery, searchConfiguration } = params;

  if (searchType === 'esqlQuery' && isRecord(esqlQuery) && typeof esqlQuery.esql === 'string') {
    return { language: 'esql', query: esqlQuery.esql };
  }

  if (searchType === 'searchSource') {
    const searchQuery = isRecord(searchConfiguration) ? searchConfiguration.query : undefined;
    if (isRecord(searchQuery) && typeof searchQuery.query === 'string') {
      return {
        language: searchQuery.language === 'lucene' ? 'lucene' : 'kql',
        query: searchQuery.query,
      };
    }
    return undefined;
  }

  if (typeof esQuery === 'string') {
    return { language: 'dsl', query: esQuery };
  }

  return undefined;
};

/** Extracts the Elasticsearch query rule params shown as a migration reference. */
export const getOriginalRuleSummary = (params: Record<string, unknown>): OriginalRuleSummary => {
  const { timeField, timeWindowSize, timeWindowUnit } = params;

  return {
    query: getQuery(params),
    timeField: typeof timeField === 'string' ? timeField : undefined,
    timeWindow:
      typeof timeWindowSize === 'number' && typeof timeWindowUnit === 'string'
        ? `${timeWindowSize}${timeWindowUnit}`
        : undefined,
  };
};
