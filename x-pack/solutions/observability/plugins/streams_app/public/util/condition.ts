/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isAlwaysCondition,
  type AlwaysCondition,
  type BinaryFilterCondition,
  type Condition,
} from '@kbn/streams-schema';
import { cloneDeep, isEqual } from 'lodash';

export const EMPTY_EQUALS_CONDITION: BinaryFilterCondition = Object.freeze({
  field: '',
  operator: 'eq',
  value: '',
});

export const ALWAYS_CONDITION: AlwaysCondition = Object.freeze({ always: {} });

export function alwaysToEmptyEquals<T extends Condition>(condition: T): Exclude<T, AlwaysCondition>;

export function alwaysToEmptyEquals(condition: Condition) {
  if (isAlwaysCondition(condition)) {
    return cloneDeep(EMPTY_EQUALS_CONDITION);
  }
  return condition;
}

export function emptyEqualsToAlways(condition: Condition) {
  if (isEqual(condition, EMPTY_EQUALS_CONDITION)) {
    return ALWAYS_CONDITION;
  }
  return condition;
}
