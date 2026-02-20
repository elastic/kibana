/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryRuleCreateProps,
  ThresholdRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { DEFAULT_SECURITY_SOLUTION_INDEXES } from '@kbn/scout-security/src/playwright/constants/detection_rules';

type RuleOverrides = Partial<QueryRuleCreateProps>;
type ThresholdOverrides = Partial<ThresholdRuleCreateProps>;

const getIndexPatterns = (): string[] => [...DEFAULT_SECURITY_SOLUTION_INDEXES];

export const getNewRule = (rewrites?: RuleOverrides): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [],
  note: '# test markdown',
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  max_signals: 100,
  ...rewrites,
});

export const getCustomQueryRuleParams = (rewrites?: RuleOverrides): QueryRuleCreateProps =>
  getNewRule(rewrites);

export const getExistingRule = (rewrites?: RuleOverrides): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  name: 'Rule 1',
  description: 'Description for Rule 1',
  index: ['auditbeat-*'],
  severity: 'high',
  risk_score: 19,
  tags: ['rule1'],
  references: [],
  false_positives: [],
  threat: [],
  note: 'This is my note',
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  max_signals: 500,
  ...rewrites,
});

export const getNewOverrideRule = (rewrites?: RuleOverrides): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Override Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: [],
  false_positives: [],
  threat: [],
  note: '# test markdown',
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  max_signals: 100,
  ...rewrites,
});

export const getEditedRule = (rewrites?: RuleOverrides): QueryRuleCreateProps =>
  getExistingRule({
    severity: 'medium',
    description: 'Edited Rule description',
    tags: ['rule1', 'edited'],
    ...rewrites,
  });

export const getNewThresholdRule = (rewrites?: ThresholdOverrides): ThresholdRuleCreateProps => ({
  type: 'threshold',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Threshold Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: [],
  false_positives: [],
  threat: [],
  note: '# test markdown',
  threshold: { field: 'host.name', value: 1 },
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  max_signals: 100,
  ...rewrites,
});
