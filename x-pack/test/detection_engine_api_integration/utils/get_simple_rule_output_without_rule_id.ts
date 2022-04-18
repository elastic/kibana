/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';
import { getSimpleRuleOutput } from './get_simple_rule_output';

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults except
 * for all the server generated properties such as created_by. Useful for testing end to end tests.
 */
export const getSimpleRuleOutputWithoutRuleId = (ruleId = 'rule-1'): Partial<RulesSchema> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { rule_id: rId, ...ruleWithoutRuleId } = rule;
  return ruleWithoutRuleId;
};
