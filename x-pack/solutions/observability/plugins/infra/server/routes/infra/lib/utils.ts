/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

interface BoolQuery {
  bool: estypes.QueryDslBoolQuery;
}

const isValidFilter = (query: any): query is BoolQuery => {
  const boolClause = (query as estypes.QueryDslQueryContainer).bool;

  if (!boolClause || Object.keys(boolClause).length === 0) {
    return false;
  }

  return [boolClause.filter, boolClause.must, boolClause.must_not, boolClause.should]
    .filter(Boolean)
    .every((clause) => Array.isArray(clause) || clause === undefined);
};

export const assertQueryStructure: (query?: any) => asserts query is BoolQuery = (query) => {
  if (!!query && !isValidFilter(query)) {
    throw Boom.badRequest('Invalid query');
  }
};
