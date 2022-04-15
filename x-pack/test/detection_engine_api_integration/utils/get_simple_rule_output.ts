/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/response/rules_schema';

/**
 * This is the typical output of a simple rule that Kibana will output with all the defaults
 * except for the server generated properties.  Useful for testing end to end tests.
 */
export const getSimpleRuleOutput = (ruleId = 'rule-1', enabled = false): Partial<RulesSchema> => ({
  actions: [],
  author: [],
  created_by: 'elastic',
  description: 'Simple Rule Query',
  enabled,
  false_positives: [],
  from: 'now-6m',
  immutable: false,
  index: ['auditbeat-*'],
  interval: '5m',
  rule_id: ruleId,
  language: 'kuery',
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 1,
  risk_score_mapping: [],
  name: 'Simple Rule Query',
  query: 'user.name: root or user.name: admin',
  references: [],
  severity: 'high',
  severity_mapping: [],
  updated_by: 'elastic',
  tags: [],
  to: 'now',
  type: 'query',
  threat: [],
  throttle: 'no_actions',
  exceptions_list: [],
  version: 1,
});
