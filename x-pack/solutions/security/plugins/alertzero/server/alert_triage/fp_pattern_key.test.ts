/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildFpPatternKey,
  buildFpPatternMaterial,
  groupFpAlertsByPattern,
  normalizePatternValue,
} from './fp_pattern_key';

describe('normalizePatternValue', () => {
  it('trims and lowercases entity values', () => {
    expect(normalizePatternValue('  Yuliias-MacBook-Pro-2.local  ')).toBe(
      'yuliias-macbook-pro-2.local'
    );
  });
});

describe('buildFpPatternKey', () => {
  it('groups by rule + host + user, ignoring process differences', () => {
    const a = {
      'host.name': 'Yuliias-MacBook-Pro-2.local',
      'user.name': 'yuliiasumenko',
      'process.executable': '/usr/libexec/advisord',
    };
    const b = {
      host: { name: 'yuliias-macbook-pro-2.local' },
      user: { name: 'YULIIASUMENKO' },
      process: { executable: '/usr/bin/git' },
    };
    expect(buildFpPatternKey({ ruleId: 'rule-1', alert: a })).toBe(
      buildFpPatternKey({ ruleId: 'rule-1', alert: b })
    );
    expect(buildFpPatternKey({ ruleId: 'rule-1', alert: a })).toBe(
      'rule:rule-1|host=yuliias-macbook-pro-2.local|user=yuliiasumenko'
    );
  });

  it('pools alerts without host or user under the rule alone', () => {
    expect(buildFpPatternMaterial({ 'process.executable': '/usr/bin/curl' })).toBeUndefined();
    expect(buildFpPatternKey({ ruleId: 'rule-1', alert: { 'event.category': 'network' } })).toBe(
      'rule:rule-1'
    );
  });

  it('separates different hosts or users under the same rule', () => {
    const left = buildFpPatternKey({
      ruleId: 'rule-1',
      alert: { 'host.name': 'host-a', 'user.name': 'root' },
    });
    const right = buildFpPatternKey({
      ruleId: 'rule-1',
      alert: { 'host.name': 'host-b', 'user.name': 'root' },
    });
    expect(left).not.toBe(right);
  });
});

describe('groupFpAlertsByPattern', () => {
  it('groups same host+user across processes and pools entity-less alerts by rule', () => {
    const alertsById = new Map<string, Record<string, unknown>>([
      [
        'a1',
        {
          'process.executable': '/usr/bin/curl',
          'host.name': 'host-a',
          'user.name': 'root',
        },
      ],
      [
        'a2',
        {
          'process.executable': '/usr/bin/git',
          'host.name': 'host-a',
          'user.name': 'root',
        },
      ],
      ['a3', { 'host.name': 'host-b', 'user.name': 'root' }],
      ['a4', { 'event.category': 'network' }],
    ]);
    const groups = groupFpAlertsByPattern({
      ruleId: 'rule-1',
      alertIds: ['a1', 'a2', 'a3', 'a4'],
      alertsById,
    });
    expect(groups).toHaveLength(3);
    const hostA = groups.find((g) => g.alertIds.includes('a1'));
    const hostB = groups.find((g) => g.alertIds.includes('a3'));
    const pooled = groups.find((g) => g.alertIds.includes('a4'));
    expect(hostA?.alertIds).toEqual(['a1', 'a2']);
    expect(hostB?.alertIds).toEqual(['a3']);
    expect(pooled?.patternKey).toBe('rule:rule-1');
    expect(hostA?.entitySummary).toContain('host-a');
  });
});
