/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FullResponseSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';
import { removeServerGeneratedProperties } from './remove_server_generated_properties';

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults
 * except for the server generated properties.  Useful for testing end to end tests.
 */
export const getBaseSimpleRuleOutput = (ruleId = 'rule-1', enabled = false) => ({
  actions: [],
  author: [],
  created_by: 'elastic',
  description: 'Simple Rule Query',
  enabled,
  false_positives: [],
  from: 'now-6m',
  immutable: false,
  interval: '5m',
  rule_id: ruleId,
  output_index: '',
  max_signals: 100,
  related_integrations: [],
  required_fields: [],
  risk_score: 1,
  risk_score_mapping: [],
  name: 'Simple Rule Query',
  references: [],
  setup: '',
  severity: 'high' as const,
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  threat: [],
  throttle: 'no_actions',
  exceptions_list: [],
  version: 1,
  id: 'id',
  updated_at: '2020-07-08T16:36:32.377Z',
  created_at: '2020-07-08T16:36:32.377Z',
});

const getQueryRuleOutput = (ruleId = 'rule-1', enabled = false): FullResponseSchema => ({
  ...getBaseSimpleRuleOutput(ruleId, enabled),
  index: ['auditbeat-*'],
  language: 'kuery',
  query: 'user.name: root or user.name: admin',
  type: 'query',
});

export const getSimpleRuleOutput = (ruleId = 'rule-1', enabled = false) => {
  return removeServerGeneratedProperties(getQueryRuleOutput(ruleId, enabled));
};
