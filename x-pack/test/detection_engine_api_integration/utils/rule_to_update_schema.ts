/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FullResponseSchema,
  UpdateRulesSchema,
} from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { omit, pickBy } from 'lodash';

const propertiesToRemove = [
  'id',
  'immutable',
  'updated_at',
  'updated_by',
  'created_at',
  'created_by',
  'related_integrations',
  'required_fields',
  'setup',
  'execution_summary',
];

/**
 * transforms FullResponseSchema rule to UpdateRulesSchema
 * returned result can be used in rule update API calls
 */
export const ruleToUpdateSchema = (rule: FullResponseSchema): UpdateRulesSchema => {
  const removedProperties = omit(rule, propertiesToRemove);

  //  We're only removing undefined values, so this cast correctly narrows the type
  return pickBy(removedProperties, (value) => value !== undefined) as UpdateRulesSchema;
};
