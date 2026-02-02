/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLCommandOption, EditorError, ESQLAstQueryExpression } from '@kbn/esql-language';
import { parse, isColumn, isOptionNode } from '@kbn/esql-language';
import { isAggregatingQuery } from './compute_if_esql_query_aggregating';

export interface ParseEsqlQueryResult {
  errors: EditorError[];
  isEsqlQueryAggregating: boolean;
  hasMetadataOperator: boolean;
}

/**
 * check if esql query valid for Security rule:
 * - if it's non aggregation query it must have metadata operator
 */
export const parseEsqlQuery = (query: string): ParseEsqlQueryResult => {
  const { root, errors } = parse(query);
  const isEsqlQueryAggregating = isAggregatingQuery(root);

  return {
    errors,
    isEsqlQueryAggregating,
    hasMetadataOperator: computeHasMetadataOperator(root),
  };
};

/**
 * checks whether query has metadata _id operator
 */
function computeHasMetadataOperator(astExpression: ESQLAstQueryExpression): boolean {
  // Check whether the `from` command has `metadata` operator
  const metadataOption = getMetadataOption(astExpression);
  if (!metadataOption) {
    return false;
  }

  // Check whether the `metadata` operator has `_id` argument
  const idColumnItem = metadataOption.args.find(
    (fromArg) => isColumn(fromArg) && fromArg.name === '_id'
  );
  if (!idColumnItem) {
    return false;
  }

  return true;
}

function getMetadataOption(astExpression: ESQLAstQueryExpression): ESQLCommandOption | undefined {
  const fromCommand = astExpression.commands.find((x) => x.name === 'from');

  if (!fromCommand?.args) {
    return undefined;
  }

  // Check whether the `from` command has `metadata` operator
  for (const fromArg of fromCommand.args) {
    if (isOptionNode(fromArg) && fromArg.name === 'metadata') {
      return fromArg;
    }
  }

  return undefined;
}
