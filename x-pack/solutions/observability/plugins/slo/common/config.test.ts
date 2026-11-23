/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('SLO config schema', () => {
  it('leaves the SLI index rounding unset to choose it from the existing indices', () => {
    const config = configSchema.validate({});

    expect(config.sliIndexRounding).toBeUndefined();
  });

  it.each(['M', 'w', 'd'])('accepts sliIndexRounding [%s]', (rounding) => {
    expect(configSchema.validate({ sliIndexRounding: rounding }).sliIndexRounding).toBe(rounding);
  });

  it('rejects an unsupported sliIndexRounding', () => {
    expect(() => configSchema.validate({ sliIndexRounding: 'h' })).toThrow(/sliIndexRounding/);
  });
});
