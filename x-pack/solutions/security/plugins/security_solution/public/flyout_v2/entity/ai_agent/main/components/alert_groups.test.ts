/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentAlert } from '../../../../../entity_analytics/components/ai_security/types';
import { countBySeverity, groupAlertsByRule } from './alert_groups';

const alert = (id: string, overrides: Partial<AgentAlert> = {}): AgentAlert => ({
  id,
  index: '.internal.alerts-security.alerts-default-000001',
  timestamp: '2026-11-26T10:00:00.000Z',
  ruleName: 'Potential Prompt Injection',
  severity: 'medium',
  status: 'open',
  isMock: false,
  ...overrides,
});

describe('groupAlertsByRule', () => {
  it('groups by rule, keeping the count, the highest severity and the newest alert', () => {
    const [group] = groupAlertsByRule([
      alert('a', { timestamp: '2026-11-26T10:00:00.000Z' }),
      alert('b', { timestamp: '2026-11-26T12:00:00.000Z', severity: 'high', processName: 'curl' }),
      alert('c', { timestamp: '2026-11-26T11:00:00.000Z' }),
    ]);
    expect(group.count).toBe(3);
    expect(group.severity).toBe('high');
    expect(group.newest.id).toBe('b');
    expect(group.newest.processName).toBe('curl');
  });

  it('sorts by severity, worst first, then by the newest alert', () => {
    const groups = groupAlertsByRule([
      alert('low', { ruleName: 'Low rule', severity: 'low' }),
      alert('older-high', {
        ruleName: 'Older high rule',
        severity: 'high',
        timestamp: '2026-11-25T10:00:00.000Z',
      }),
      alert('critical', { ruleName: 'Critical rule', severity: 'critical' }),
      alert('newer-high', { ruleName: 'Newer high rule', severity: 'high' }),
      alert('none', { ruleName: 'No severity rule', severity: undefined }),
    ]);
    expect(groups.map(({ ruleName }) => ruleName)).toEqual([
      'Critical rule',
      'Newer high rule',
      'Older high rule',
      'Low rule',
      'No severity rule',
    ]);
  });

  it('keeps alerts with no rule name apart', () => {
    expect(
      groupAlertsByRule([alert('a', { ruleName: undefined }), alert('b', { ruleName: undefined })])
    ).toHaveLength(2);
  });
});

describe('countBySeverity', () => {
  it('counts in a fixed order whatever order the alerts come in', () => {
    expect(
      countBySeverity([
        alert('a', { severity: 'medium' }),
        alert('b', { severity: 'low' }),
        alert('c', { severity: 'critical' }),
        alert('d', { severity: 'medium' }),
        alert('e', { severity: 'high' }),
      ])
    ).toEqual([
      ['critical', 1],
      ['high', 1],
      ['medium', 2],
      ['low', 1],
    ]);
  });
});
