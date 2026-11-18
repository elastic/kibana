/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBlockedByPolicyOnly, partitionHuntUniverse } from './partition_hunt_universe';

describe('isBlockedByPolicyOnly', () => {
  it('returns true only for empty_universe with policy_skipped and no missing', () => {
    expect(
      isBlockedByPolicyOnly({
        resolution: 'blocked:empty_universe',
        policy_skipped: ['.alerts-x'],
        missing: [],
      })
    ).toBe(true);
  });

  it('returns false for discovery_failed even when policy_skipped is set and missing is empty', () => {
    expect(
      isBlockedByPolicyOnly({
        resolution: 'blocked:discovery_failed',
        policy_skipped: ['.alerts-x'],
        missing: [],
      })
    ).toBe(false);
  });

  it('returns false when missing is non-empty, even with policy_skipped', () => {
    expect(
      isBlockedByPolicyOnly({
        resolution: 'blocked:empty_universe',
        policy_skipped: ['.alerts-x'],
        missing: ['custom-1'],
      })
    ).toBe(false);
  });

  it('returns false when policy_skipped is empty or absent', () => {
    expect(
      isBlockedByPolicyOnly({
        resolution: 'blocked:empty_universe',
        policy_skipped: [],
        missing: [],
      })
    ).toBe(false);
    expect(isBlockedByPolicyOnly({ resolution: 'blocked:empty_universe', missing: [] })).toBe(
      false
    );
  });
});

describe('partitionHuntUniverse', () => {
  it.each([
    '.alerts-security.alerts-default',
    '.siem-signals-infosec-detections',
    '.internal.alerts-*',
    'remote:.alerts-*',
    '*:.alerts-*',
    '<.siem-signals-{now/d}>',
    '<.siem-signals-{now/d{yyyy.MM.dd|+12:00}}>',
    'remote:<.alerts-{now/d}>',
    'remote:<.alerts-{now/d{yyyy.MM.dd|+12:00}}>',
  ])('skips %s', (entry) => {
    expect(partitionHuntUniverse(['logs-*', entry])).toEqual({
      patterns: ['logs-*'],
      policySkipped: [entry],
    });
  });

  it.each([
    '<logs-{now/d}>',
    '<logs-{now/d{yyyy.MM.dd|+12:00}}>',
    '-<.alerts-{now/d}>',
    '.ds-logs-okta.system-default-2026.09.30-000001',
    '-.alerts-*',
    '-remote:.alerts-*',
    '-remote:<.alerts-{now/d}>',
    'logs-*',
  ])('keeps %s', (entry) => {
    expect(partitionHuntUniverse([entry])).toEqual({ patterns: [entry], policySkipped: [] });
  });

  it('preserves order and keeps duplicates', () => {
    expect(partitionHuntUniverse(['.a-1', 'logs-*', '.a-1', 'logs-*', 'x-*'])).toEqual({
      patterns: ['logs-*', 'logs-*', 'x-*'],
      policySkipped: ['.a-1', '.a-1'],
    });
  });

  it('handles empty input', () => {
    expect(partitionHuntUniverse([])).toEqual({ patterns: [], policySkipped: [] });
  });
});
