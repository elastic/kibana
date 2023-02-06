/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleCreateProps,
  RuleUpdateProps,
} from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';
import { getSimpleRule } from './get_simple_rule';

export const getRuleWithWebHookAction = (
  id: string,
  enabled = false,
  rule?: RuleCreateProps
): RuleCreateProps | RuleUpdateProps => {
  const finalRule = rule != null ? { ...rule, enabled } : getSimpleRule('rule-1', enabled);
  return {
    ...finalRule,
    throttle: 'rule',
    actions: [
      {
        group: 'default',
        id,
        params: {
          body: '{}',
        },
        action_type_id: '.webhook',
      },
    ],
  };
};
