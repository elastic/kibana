/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSimpleRuleOutput } from './get_simple_rule_output';
import type { RulesSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';

export const getSimpleRuleOutputWithWebHookAction = (actionId: string): Partial<RulesSchema> => ({
  ...getSimpleRuleOutput(),
  throttle: 'rule',
  actions: [
    {
      action_type_id: '.webhook',
      group: 'default',
      id: actionId,
      params: {
        body: '{}',
      },
    },
  ],
});
