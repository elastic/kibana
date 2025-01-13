/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListOperator, ListOperatorType } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

export const LIST_ITEM_ENTRY_OPERATOR_TYPES: readonly ListOperatorType[] = Object.freeze([
  ListOperatorTypeEnum.NESTED,
  ListOperatorTypeEnum.MATCH,
  ListOperatorTypeEnum.MATCH_ANY,
  ListOperatorTypeEnum.WILDCARD,
  ListOperatorTypeEnum.EXISTS,
  ListOperatorTypeEnum.LIST,
]);

export const LIST_ITEM_ENTRY_OPERATOR: readonly ListOperator[] = Object.freeze([
  ListOperatorEnum.INCLUDED,
  ListOperatorEnum.EXCLUDED,
]);
