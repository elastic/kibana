/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('SLO config schema', () => {
  it('defaults to monthly SLI indices and a 180 days retention', () => {
    const config = configSchema.validate({});

    expect(config.sliIndexRounding).toBe('M');
    expect(config.sliRetentionTaskEnabled).toBe(true);
    expect(config.sliRetentionPeriod.asDays()).toBe(180);
  });

  it.each(['M', 'w', 'd'])('accepts sliIndexRounding [%s]', (rounding) => {
    expect(configSchema.validate({ sliIndexRounding: rounding }).sliIndexRounding).toBe(rounding);
  });

  it('rejects an unsupported sliIndexRounding', () => {
    expect(() => configSchema.validate({ sliIndexRounding: 'h' })).toThrow(/sliIndexRounding/);
  });

  it('rejects a sliRetentionPeriod shorter than 91 days', () => {
    expect(() => configSchema.validate({ sliRetentionPeriod: '30d' })).toThrow(
      /must be at least 91 days/
    );
  });

  it.each(['91d', '365d'])('accepts sliRetentionPeriod [%s]', (period) => {
    expect(() => configSchema.validate({ sliRetentionPeriod: period })).not.toThrow();
  });
});
