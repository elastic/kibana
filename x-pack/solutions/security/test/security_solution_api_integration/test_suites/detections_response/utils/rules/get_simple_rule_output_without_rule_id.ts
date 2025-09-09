/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSimpleRuleOutput } from './get_simple_rule_output';
import { RuleWithoutServerGeneratedProperties } from './remove_server_generated_properties';

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults except
 * for all the server generated properties such as created_by. Useful for testing end to end tests.
 */
export const getSimpleRuleOutputWithoutRuleId = (
  ruleId = 'rule-1'
): Omit<RuleWithoutServerGeneratedProperties, 'rule_id'> => {
  const rule = getSimpleRuleOutput(ruleId);
  const { rule_id: rId, ...ruleWithoutRuleId } = rule;
  return ruleWithoutRuleId;
};
