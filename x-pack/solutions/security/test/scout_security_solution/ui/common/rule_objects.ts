/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryRuleCreateProps,
  ThresholdRuleCreateProps,
  EqlRuleCreateProps,
  EsqlRuleCreateProps,
  ThreatMatchRuleCreateProps,
  MachineLearningRuleCreateProps,
  NewTermsRuleCreateProps,
  SavedQueryRuleCreateProps,
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

export const getNewEqlRule = (rewrites?: Partial<EqlRuleCreateProps>): EqlRuleCreateProps => ({
  type: 'eql',
  language: 'eql',
  query: 'any where true',
  index: getIndexPatterns(),
  name: 'EQL Rule Test',
  description: 'EQL rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});

export const getNewEsqlRule = (rewrites?: Partial<EsqlRuleCreateProps>): EsqlRuleCreateProps => ({
  type: 'esql',
  language: 'esql',
  query: 'FROM auditbeat-* | LIMIT 10',
  name: 'ES|QL Rule Test',
  description: 'ES|QL rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});

export const getNewIndicatorMatchRule = (
  rewrites?: Partial<ThreatMatchRuleCreateProps>
): ThreatMatchRuleCreateProps => ({
  type: 'threat_match',
  query: '*:*',
  index: getIndexPatterns(),
  name: 'Indicator Match Rule Test',
  description: 'Indicator match rule description.',
  severity: 'critical',
  risk_score: 20,
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  threat_mapping: [
    {
      entries: [{ field: 'host.name', type: 'mapping', value: 'threat.indicator.ip' }],
    },
  ],
  threat_index: ['threat-indicator-*'],
  threat_query: '*:*',
  threat_language: 'kuery',
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});

export const getNewMachineLearningRule = (
  rewrites?: Partial<MachineLearningRuleCreateProps>
): MachineLearningRuleCreateProps => ({
  type: 'machine_learning',
  machine_learning_job_id: ['v3_linux_anomalous_network_activity'],
  anomaly_threshold: 20,
  name: 'ML Rule Test',
  description: 'ML rule description.',
  severity: 'critical',
  risk_score: 70,
  tags: ['test', 'ml'],
  references: [],
  false_positives: [],
  threat: [],
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});

export const getNewTermsRule = (
  rewrites?: Partial<NewTermsRuleCreateProps>
): NewTermsRuleCreateProps => ({
  type: 'new_terms',
  query: '*:*',
  new_terms_fields: ['host.name'],
  history_window_start: 'now-7d',
  index: getIndexPatterns(),
  name: 'New Terms Rule Test',
  description: 'New terms rule description.',
  severity: 'high',
  risk_score: 21,
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});

export const getNewSavedQueryRule = (
  rewrites?: Partial<SavedQueryRuleCreateProps>
): SavedQueryRuleCreateProps => ({
  type: 'saved_query',
  saved_id: 'test-saved-query',
  index: getIndexPatterns(),
  name: 'Saved Query Rule Test',
  description: 'Saved query rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test'],
  references: [],
  false_positives: [],
  threat: [],
  interval: '100m',
  from: '1900-01-01T00:00:00.000Z',
  ...rewrites,
});
