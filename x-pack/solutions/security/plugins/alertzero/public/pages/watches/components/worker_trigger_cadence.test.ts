/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workerScheduleCadenceLabel } from './worker_trigger_cadence';

describe('workerScheduleCadenceLabel', () => {
  it('drops the count for a one-unit interval', () => {
    expect(workerScheduleCadenceLabel('1h')).toBe('Every hour');
    expect(workerScheduleCadenceLabel('1m')).toBe('Every minute');
    expect(workerScheduleCadenceLabel('1d')).toBe('Every day');
  });

  it('uses the plural unit for a multi-unit interval', () => {
    expect(workerScheduleCadenceLabel('2h')).toBe('Every 2 hours');
    expect(workerScheduleCadenceLabel('30m')).toBe('Every 30 minutes');
    expect(workerScheduleCadenceLabel('7d')).toBe('Every 7 days');
  });

  it('defaults to every hour when no interval is set', () => {
    expect(workerScheduleCadenceLabel(undefined)).toBe('Every hour');
  });
});
