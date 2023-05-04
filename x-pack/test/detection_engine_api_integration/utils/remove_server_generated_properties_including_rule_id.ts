/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

import { removeServerGeneratedProperties } from './remove_server_generated_properties';

/**
 * This will remove server generated properties such as date times, etc... including the rule_id
 * @param rule Rule to pass in to remove typical server generated properties
 */
export const removeServerGeneratedPropertiesIncludingRuleId = (
  rule: RuleResponse
): Partial<RuleResponse> => {
  const ruleWithRemovedProperties = removeServerGeneratedProperties(rule);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...additionalRuledIdRemoved } = ruleWithRemovedProperties;
  return additionalRuledIdRemoved;
};
