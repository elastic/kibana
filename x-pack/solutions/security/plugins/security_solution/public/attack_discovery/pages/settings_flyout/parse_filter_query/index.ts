/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has, isEqual } from 'lodash/fp';

export const EMPTY_BOOL_FILTER_QUERY = { bool: { must: [], filter: [], should: [], must_not: [] } };

export const isEmptyBoolFilterQuery = (filterQuery: Record<string, unknown> | undefined): boolean =>
  filterQuery == null || isEqual(EMPTY_BOOL_FILTER_QUERY, filterQuery);

export const parseFilterQuery = ({
  filterQuery,
  kqlError,
}: {
  filterQuery: string | undefined;
  kqlError: Error | undefined;
}): Record<string, unknown> | undefined => {
  if (kqlError != null || filterQuery == null) {
    return undefined;
  }

  try {
    const parsedQuery = JSON.parse(filterQuery);

    const queryIsValid = has('bool', parsedQuery) && !isEmptyBoolFilterQuery(parsedQuery);
    if (queryIsValid) {
      return parsedQuery;
    }
  } catch {
    // ignore
  }

  return undefined;
};
