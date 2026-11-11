/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('digital_experience config', () => {
  const sessionsDefaults = { frequency: '1m' };

  it('is disabled by default', () => {
    expect(config.schema.validate({})).toEqual({ enabled: false, sessions: sessionsDefaults });
  });

  it('can be enabled', () => {
    expect(config.schema.validate({ enabled: true })).toEqual({
      enabled: true,
      sessions: sessionsDefaults,
    });
  });

  it('accepts a sessions frequency', () => {
    expect(config.schema.validate({ sessions: { frequency: '5m' } }).sessions).toEqual({
      frequency: '5m',
    });
  });

  it.each(['0m', '2h', '1d', '5 m', 'fast'])('rejects frequency %s', (frequency) => {
    expect(() => config.schema.validate({ sessions: { frequency } })).toThrow(/frequency/);
  });

  it('has no partitions setting, as one task summarizes every session', () => {
    expect(() => config.schema.validate({ sessions: { partitions: 4 } })).toThrow(/partitions/);
  });
});
