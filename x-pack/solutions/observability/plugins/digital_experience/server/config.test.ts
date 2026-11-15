/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDeprecationsFor } from '@kbn/core-test-helpers-deprecations-getters';
import { config } from './config';

describe('digital_experience config', () => {
  it('has no settings', () => {
    expect(config.schema.validate({})).toEqual({});
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
});
