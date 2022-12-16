/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { omit, pickBy } from 'lodash';

const serverGeneratedProperties = ['id', 'created_at', 'updated_at', 'execution_summary'] as const;

type ServerGeneratedProperties = typeof serverGeneratedProperties[number];
export type RuleWithoutServerGeneratedProperties = Omit<RuleResponse, ServerGeneratedProperties>;

/**
 * This will remove server generated properties such as date times, etc...
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedProperties = (
  rule: RuleResponse
): RuleWithoutServerGeneratedProperties => {
  const removedProperties = omit(rule, serverGeneratedProperties);

  // We're only removing undefined values, so this cast correctly narrows the type
  return pickBy(
    removedProperties,
    (value) => value !== undefined
  ) as RuleWithoutServerGeneratedProperties;
};
