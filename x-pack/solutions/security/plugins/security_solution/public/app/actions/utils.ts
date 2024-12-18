/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Serializable } from '@kbn/utility-types';

// All cell actions are disabled for these fields in Security
const FIELDS_WITHOUT_CELL_ACTIONS = [
  'signal.rule.risk_score',
  'kibana.alert.risk_score',
  'signal.reason',
  'kibana.alert.reason',
];

export const fieldHasCellActions = (field?: string): boolean => {
  return !!field && !FIELDS_WITHOUT_CELL_ACTIONS.includes(field);
};

export const isCountField = (
  fieldType: string | undefined,
  sourceParamType: Serializable | undefined
) => {
  return fieldType === 'number' && sourceParamType === 'value_count';
};
