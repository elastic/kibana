/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EntityRiskFieldPrefix = 'host' | 'user';

/**
 * Transforms filter query from risk index field names (host.risk.* / user.risk.*) to entity store v2 (entity.risk.*).
 */
export const transformFilterForEntityStore = (
  filterQuery: string | undefined,
  fieldPrefix: EntityRiskFieldPrefix = 'host'
): string | undefined => {
  if (!filterQuery || filterQuery === '{}' || filterQuery === '""') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(filterQuery) as Record<string, unknown>;
    const str = JSON.stringify(parsed);
    return str.replace(new RegExp(`${fieldPrefix}\\.risk\\.`, 'g'), 'entity.risk.');
  } catch {
    return undefined;
  }
};

/**
 * Builds the base filter for risk scores from entity store v2.
 * Only returns entities that have risk data.
 */
export const buildEntityStoreRiskFilter = (): string =>
  JSON.stringify({
    bool: {
      filter: [{ exists: { field: 'entity.risk.calculated_score_norm' } }],
    },
  });

/**
 * Merges the entity store risk filter with the transformed user filter.
 */
export const mergeFilters = (
  baseFilter: string,
  userFilter: string | undefined
): string | undefined => {
  if (!userFilter) {
    return baseFilter;
  }
  try {
    const base = JSON.parse(baseFilter) as Record<string, unknown>;
    const user = JSON.parse(userFilter) as Record<string, unknown>;
    return JSON.stringify({
      bool: {
        must: [base, user],
      },
    });
  } catch {
    return baseFilter;
  }
};
