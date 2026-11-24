/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NO_VALUE,
  formatCount,
  formatDays,
  formatDuration,
  formatFrequency,
  formatTaskName,
} from './format';

describe('formatDuration', () => {
  it.each([
    ['59s', '59 seconds'],
    ['1m', '1 minute'],
    ['3h', '3 hours'],
    ['1d', '1 day'],
    ['500ms', '500 milliseconds'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });

  it('shows a dash when there is no value and keeps values it cannot read', () => {
    expect(formatDuration(undefined)).toBe(NO_VALUE);
    expect(formatDuration('')).toBe(NO_VALUE);
    expect(formatDuration('soon')).toBe('soon');
  });
});

describe('formatFrequency', () => {
  it.each([
    ['1m', 'Every minute'],
    ['30m', 'Every 30 minutes'],
    ['1h', 'Every hour'],
    ['24h', 'Every 24 hours'],
    ['1d', 'Every day'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatFrequency(value)).toBe(expected);
  });

  it('shows a dash when there is no value', () => {
    expect(formatFrequency(undefined)).toBe(NO_VALUE);
  });
});

describe('formatCount and formatDays', () => {
  it('groups digits and shows a dash for a missing count', () => {
    expect(formatCount(50000)).toBe('50,000');
    expect(formatCount(0)).toBe('0');
    expect(formatCount(undefined)).toBe(NO_VALUE);
  });

  it('formats retention days', () => {
    expect(formatDays(1)).toBe('1 day');
    expect(formatDays(60)).toBe('60 days');
  });
});

describe('formatTaskName', () => {
  it.each([
    ['entity_store:v2:extract_entity_task:host:default', 'Log extraction'],
    [
      'entity_store:v2:extract_entity_non_priority_task:user:default',
      'Log extraction (non-priority)',
    ],
    ['entity_store:v2:history_snapshot_task:default', 'History snapshot'],
    ['entity_store:v2:status_report_task:default', 'Status report'],
    ['entity_store:v2:entity_maintainer_task:risk-score:default', 'Maintainer: risk-score'],
  ])('names %s', (id, expected) => {
    expect(formatTaskName(id)).toBe(expected);
  });

  it('keeps ids it does not know', () => {
    expect(formatTaskName('some:other:id')).toBe('some:other:id');
    expect(formatTaskName('entity_store:v2:new_task:x')).toBe('entity_store:v2:new_task:x');
  });
});
