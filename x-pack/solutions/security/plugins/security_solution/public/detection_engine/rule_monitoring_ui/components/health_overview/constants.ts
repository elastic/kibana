/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_TYPE_NAMES: Record<string, string> = {
  'siem.eqlRule': 'EQL',
  'siem.queryRule': 'Query',
  'siem.savedQueryRule': 'Saved Query',
  'siem.thresholdRule': 'Threshold',
  'siem.mlRule': 'Machine Learning',
  'siem.indicatorRule': 'Indicator Match',
  'siem.newTermsRule': 'New Terms',
  'siem.esqlRule': 'ES|QL',
};

export const LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'trace'] as const;

export const CHART_HEIGHT = 220;

export const getRuleTypeName = (key: string): string =>
  RULE_TYPE_NAMES[key] ?? key.replace('siem.', '').replace('Rule', '');
