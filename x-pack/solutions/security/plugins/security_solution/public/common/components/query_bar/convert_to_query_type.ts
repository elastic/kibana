/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Query, AggregateQuery } from '@kbn/es-query';

/**
 * converts AggregateQuery type to Query
 * it needed because unified search bar emits 2 types of queries: Query and AggregateQuery
 * on security side we deal with one type only (Query), so we converge it to this type only
 */
export const convertToQueryType = (query: Query | AggregateQuery): Query => {
  if ('esql' in query) {
    return {
      query: query.esql,
      language: 'esql',
    };
  }
  return query;
};
