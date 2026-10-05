/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { workerScheduleCadenceLabel } from './worker_trigger_cadence';

describe('workerScheduleCadenceLabel', () => {
  it('uses the singular unit for a one-unit interval', () => {
    expect(workerScheduleCadenceLabel('1h')).toBe('Every 1 hour');
    expect(workerScheduleCadenceLabel('1m')).toBe('Every 1 minute');
    expect(workerScheduleCadenceLabel('1d')).toBe('Every 1 day');
  });

  it('uses the plural unit for a multi-unit interval', () => {
    expect(workerScheduleCadenceLabel('2h')).toBe('Every 2 hours');
    expect(workerScheduleCadenceLabel('30m')).toBe('Every 30 minutes');
    expect(workerScheduleCadenceLabel('7d')).toBe('Every 7 days');
  });

  it('defaults to 1 hour, singular, when no interval is set', () => {
    expect(workerScheduleCadenceLabel(undefined)).toBe('Every 1 hour');
  });
});
