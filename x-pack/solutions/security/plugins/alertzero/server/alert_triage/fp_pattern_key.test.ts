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
  it('lowercases and strips user-profile and GUID noise', () => {
    expect(
      normalizePatternValue('C:\\Users\\Anna\\AppData\\Local\\Temp\\{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}\\setup.exe')
    ).toBe('c:\\users\\<user>\\appdata\\local\\temp\\<guid>\\setup.exe');
  });
});

describe('buildFpPatternKey', () => {
  it('builds a stable process pattern across users', () => {
    const a = {
      'process.executable': 'C:\\Users\\anna\\AppData\\Local\\Temp\\{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}\\tool.exe',
      'process.code_signature.subject_name': 'Contoso',
      'process.parent.executable': 'C:\\Windows\\explorer.exe',
    };
    const b = {
      process: {
        executable: 'C:\\Users\\bob\\AppData\\Local\\Temp\\{ffffffff-1111-2222-3333-444444444444}\\tool.exe',
        code_signature: { subject_name: 'Contoso' },
        parent: { executable: 'C:\\Windows\\explorer.exe' },
      },
    };
    expect(buildFpPatternKey({ ruleId: 'rule-1', alert: a })).toBe(
      buildFpPatternKey({ ruleId: 'rule-1', alert: b })
    );
  });

  it('pools alerts without an identifying condition under the rule alone', () => {
    expect(buildFpPatternMaterial({ 'event.category': 'network' })).toBeUndefined();
    expect(buildFpPatternKey({ ruleId: 'rule-1', alert: { 'event.category': 'network' } })).toBe(
      'rule:rule-1'
    );
  });

  it('separates different executables', () => {
    const left = buildFpPatternKey({
      ruleId: 'rule-1',
      alert: { 'process.executable': 'C:\\Windows\\System32\\cmd.exe' },
    });
    const right = buildFpPatternKey({
      ruleId: 'rule-1',
      alert: { 'process.executable': 'C:\\Windows\\System32\\powershell.exe' },
    });
    expect(left).not.toBe(right);
  });
});

describe('groupFpAlertsByPattern', () => {
  it('groups matching patterns and pools one-offs by rule', () => {
    const alertsById = new Map<string, Record<string, unknown>>([
      ['a1', { 'process.executable': '/usr/bin/curl', 'host.name': 'host-a', 'user.name': 'root' }],
      ['a2', { 'process.executable': '/usr/bin/curl', 'host.name': 'host-b' }],
      ['a3', { 'event.category': 'network' }],
    ]);
    const groups = groupFpAlertsByPattern({
      ruleId: 'rule-1',
      alertIds: ['a1', 'a2', 'a3'],
      alertsById,
    });
    expect(groups).toHaveLength(2);
    const curl = groups.find((g) => g.alertIds.includes('a1'));
    const pooled = groups.find((g) => g.alertIds.includes('a3'));
    expect(curl?.alertIds).toEqual(['a1', 'a2']);
    expect(pooled?.patternKey).toBe('rule:rule-1');
    expect(curl?.entitySummary).toContain('host-a');
  });
});
