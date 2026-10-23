/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSyntheticsFilterDisplayValues,
  getSyntheticsFilterKeyForLabel,
  sortScheduleFilterValues,
} from './filter_fields';

describe('schedule filter labels', () => {
  it('labels seconds and minutes separately', () => {
    expect(
      getSyntheticsFilterDisplayValues(
        [
          { label: '10s', count: 1 },
          { label: '10m', count: 2 },
          { label: '5', count: 3 },
        ],
        'schedules',
        []
      )
    ).toEqual([
      { label: 'Every 10 seconds', count: 1 },
      { label: 'Every 10 minutes', count: 2 },
      { label: 'Every 5 minutes', count: 3 },
    ]);
  });

  it('orders frequency options by duration without changing the shared label order', () => {
    const values = [
      { label: '3m', count: 1 },
      { label: '5m', count: 1 },
      { label: '10m', count: 1 },
      { label: '10s', count: 1 },
    ];

    expect(sortScheduleFilterValues(values).map(({ label }) => label)).toEqual([
      '10s',
      '3m',
      '5m',
      '10m',
    ]);
    expect(
      getSyntheticsFilterDisplayValues(values, 'schedules', []).map(({ label }) => label)
    ).toEqual(['Every 3 minutes', 'Every 5 minutes', 'Every 10 minutes', 'Every 10 seconds']);
  });

  it('keeps the unit when a frequency label is selected', () => {
    expect(getSyntheticsFilterKeyForLabel('Every 10 seconds', 'schedules')).toBe('10s');
    expect(getSyntheticsFilterKeyForLabel('Every 10 minutes', 'schedules')).toBe('10m');
    expect(getSyntheticsFilterKeyForLabel('Every 1 minute', 'schedules')).toBe('1m');
  });

  it('keeps an existing schedule key, treating a bare number as minutes', () => {
    expect(getSyntheticsFilterKeyForLabel('10s', 'schedules')).toBe('10s');
    expect(getSyntheticsFilterKeyForLabel('10m', 'schedules')).toBe('10m');
    expect(getSyntheticsFilterKeyForLabel('10', 'schedules')).toBe('10m');
  });
});
