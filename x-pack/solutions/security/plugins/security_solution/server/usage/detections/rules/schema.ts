/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { ruleTypeUsageSchema } from './schemas/detection_rule_usage';
import { ruleMetricsSchema } from './schemas/prebuilt_rule_detail';
import { ruleStatusMetricsSchema } from './schemas/detection_rule_status';
import type { RuleAdoption } from './types';

export const rulesMetricsSchema: MakeSchemaFrom<RuleAdoption> = {
  spaces_usage: {
    total: {
      type: 'long',
      _meta: { description: 'Total number of spaces where detection rules added' },
    },
    rules_in_spaces: {
      type: 'array',
      items: {
        type: 'long',
        _meta: { description: 'Number of rules is each space' },
      },
    },
  },
  detection_rule_usage: ruleTypeUsageSchema,
  detection_rule_detail: {
    type: 'array',
    items: ruleMetricsSchema,
  },
  detection_rule_status: ruleStatusMetricsSchema,
};
