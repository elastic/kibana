/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ESQLAstQueryExpression, parse } from '@kbn/esql-language';

export const isAggregatingQuery = (astExpression: ESQLAstQueryExpression): boolean =>
  astExpression.commands.some((command) => command.name === 'stats');

/**
 * compute if esqlQuery is aggregating/grouping, i.e. using STATS...BY command
 * @param esqlQuery
 * @returns boolean
 */
export const computeIsESQLQueryAggregating = (esqlQuery: string): boolean => {
  const { root } = parse(esqlQuery);
  return isAggregatingQuery(root);
};
