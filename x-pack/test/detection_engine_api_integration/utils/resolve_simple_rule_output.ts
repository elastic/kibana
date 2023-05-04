/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSimpleRuleOutput } from './get_simple_rule_output';

export const resolveSimpleRuleOutput = (ruleId = 'rule-1', enabled = false) => ({
  ...getSimpleRuleOutput(ruleId, enabled),
  outcome: 'exactMatch',
});
