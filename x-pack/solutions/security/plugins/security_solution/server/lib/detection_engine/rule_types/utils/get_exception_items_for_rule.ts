/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';

import { isEsqlOutputColumnsItem } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';

/**
 * Splits the exception items of a rule by what they apply to. The items on the source documents become the DSL filter of the
 * rule, as for every rule type. The items on the ES|QL output columns test the columns that an ES|QL query returns, so only an
 * ES|QL rule uses them, and any other rule type drops them: it would test the field on the source documents, where the column
 * does not exist, and an exclusion on such a field can exclude every alert.
 */
export const getExceptionItemsForRule = ({
  items,
  isEsqlRule,
}: {
  items: ExceptionListItemSchema[];
  isEsqlRule: boolean;
}): { sourceItems: ExceptionListItemSchema[]; outputColumnItems: ExceptionListItemSchema[] } => {
  const [outputColumnItems, sourceItems] = partition(items, isEsqlOutputColumnsItem);
  return { sourceItems, outputColumnItems: isEsqlRule ? outputColumnItems : [] };
};
