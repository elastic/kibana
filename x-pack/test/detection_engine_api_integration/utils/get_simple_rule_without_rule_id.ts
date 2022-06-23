/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { getSimpleRule } from './get_simple_rule';

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 */
export const getSimpleRuleWithoutRuleId = (): CreateRulesSchema => {
  const simpleRule = getSimpleRule();
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { rule_id, ...ruleWithoutId } = simpleRule;
  return ruleWithoutId;
};
