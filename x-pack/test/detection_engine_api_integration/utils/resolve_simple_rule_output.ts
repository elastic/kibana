/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/response/rules_schema';

import { getSimpleRuleOutput } from './get_simple_rule_output';

export const resolveSimpleRuleOutput = (
  ruleId = 'rule-1',
  enabled = false
): Partial<RulesSchema> => ({ outcome: 'exactMatch', ...getSimpleRuleOutput(ruleId, enabled) });
