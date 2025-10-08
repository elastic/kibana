/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { UpgradeableRulesSummary } from '../types';

export const ruleUpgradeStatusSchema: MakeSchemaFrom<UpgradeableRulesSummary> = {
  total: {
    type: 'long',
    _meta: { description: 'The number of total upgradeable elastic rules' },
  },
  customized: {
    type: 'long',
    _meta: { description: 'The number of customized upgradeable elastic rules' },
  },
  enabled: {
    type: 'long',
    _meta: { description: 'The number of enabled upgradeable elastic rules' },
  },
  disabled: {
    type: 'long',
    _meta: { description: 'The number of disabled upgradeable elastic rules' },
  },
};
