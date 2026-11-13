/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeprecationsFor } from '@kbn/core-test-helpers-deprecations-getters';
import { config } from './config';

describe('digital_experience config', () => {
  const sessionsDefaults = { frequency: '1m', concurrency: 2 };

  it('only holds the sessions settings', () => {
    expect(config.schema.validate({})).toEqual({ sessions: sessionsDefaults });
  });

  it('no longer accepts an enabled key in the schema', () => {
    expect(() => config.schema.validate({ enabled: true })).toThrow(/enabled/);
  });

  it('drops the deprecated enabled key with a warning', () => {
    const { deprecations } = config;
    if (!deprecations) {
      throw new Error('The digital_experience config declares no deprecations');
    }

    const { levels, messages, migrated } = getDeprecationsFor({
      provider: deprecations,
      settings: { enabled: true },
      path: 'xpack.digital_experience',
    });

    expect(migrated).not.toHaveProperty('xpack.digital_experience.enabled');
    expect(levels).toEqual(['warning']);
    expect(messages).toEqual([
      'You no longer need to configure "xpack.digital_experience.enabled".',
    ]);
  });

  it('accepts a sessions frequency', () => {
    expect(config.schema.validate({ sessions: { frequency: '5m' } }).sessions).toEqual({
      ...sessionsDefaults,
      frequency: '5m',
    });
  });

  it.each(['0m', '2h', '1d', '5 m', 'fast'])('rejects frequency %s', (frequency) => {
    expect(() => config.schema.validate({ sessions: { frequency } })).toThrow(/frequency/);
  });

  it.each([1, 8])('accepts a summary query concurrency of %s', (concurrency) => {
    expect(config.schema.validate({ sessions: { concurrency } }).sessions.concurrency).toBe(
      concurrency
    );
  });

  it.each([0, 9, 1.5])('rejects a summary query concurrency of %s', (concurrency) => {
    expect(() => config.schema.validate({ sessions: { concurrency } })).toThrow(/concurrency/);
  });

  it('has no partitions setting, as one task summarizes every session', () => {
    expect(() => config.schema.validate({ sessions: { partitions: 4 } })).toThrow(/partitions/);
  });
});
