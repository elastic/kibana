/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TriageAlert } from './types';

export const NOW = Date.UTC(2026, 9, 9, 12);
export const HOUR_MS = 60 * 60 * 1000;

let nextId = 0;

export const makeAlert = (overrides: Partial<TriageAlert> = {}): TriageAlert => {
  nextId += 1;
  const alert: TriageAlert = {
    id: `alert-${nextId}`,
    ruleId: 'rule-a',
    ruleName: 'Rule A',
    riskScore: 50,
    timestamp: NOW - HOUR_MS,
    status: 'open',
    tags: [],
    ...overrides,
  };
  // A rule's name follows its id unless the test names it.
  return {
    ...alert,
    ruleName:
      overrides.ruleName ?? (overrides.ruleId ? `Rule ${overrides.ruleId}` : alert.ruleName),
  };
};

export const makeAlerts = (count: number, overrides: Partial<TriageAlert> = {}): TriageAlert[] =>
  Array.from({ length: count }, () => makeAlert(overrides));
