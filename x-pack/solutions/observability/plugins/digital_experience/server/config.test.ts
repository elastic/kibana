/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('digital_experience config', () => {
  const sessionsDefaults = { frequency: '1m', partitions: 1 };

  it('is disabled by default', () => {
    expect(config.schema.validate({})).toEqual({ enabled: false, sessions: sessionsDefaults });
  });

  it('can be enabled', () => {
    expect(config.schema.validate({ enabled: true })).toEqual({
      enabled: true,
      sessions: sessionsDefaults,
    });
  });

  it('accepts a sessions frequency and partition count', () => {
    expect(
      config.schema.validate({ sessions: { frequency: '5m', partitions: 4 } }).sessions
    ).toEqual({ frequency: '5m', partitions: 4 });
  });

  it.each(['0m', '2h', '1d', '5 m', 'fast'])('rejects frequency %s', (frequency) => {
    expect(() => config.schema.validate({ sessions: { frequency } })).toThrow(/frequency/);
  });

  it.each([0, 33, 1.5])('rejects %s partitions', (partitions) => {
    expect(() => config.schema.validate({ sessions: { partitions } })).toThrow(/partitions/);
  });
});
