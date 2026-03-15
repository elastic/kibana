/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EditorError } from '@elastic/esql/types';
import { Parser } from '@elastic/esql';
import { isAggregatingQuery } from './compute_if_esql_query_aggregating';

export interface ParseEsqlQueryResult {
  errors: EditorError[];
  isEsqlQueryAggregating: boolean;
}

export const parseEsqlQuery = (query: string): ParseEsqlQueryResult => {
  const { root, errors } = Parser.parse(query);
  const isEsqlQueryAggregating = isAggregatingQuery(root);

  return {
    errors,
    isEsqlQueryAggregating,
  };
};
