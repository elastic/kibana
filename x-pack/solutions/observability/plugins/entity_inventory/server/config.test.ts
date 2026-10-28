/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config, configSchema } from './config';

describe('entityInventory config', () => {
  it('uses the exported schema in the descriptor', () => {
    expect(config.schema).toBe(configSchema);
  });

  it('is disabled by default', () => {
    expect(configSchema.validate({})).toEqual({ enabled: false });
  });

  it('accepts enabled: true', () => {
    expect(configSchema.validate({ enabled: true })).toEqual({ enabled: true });
  });

  it('rejects unknown keys', () => {
    expect(() => configSchema.validate({ enabled: true, unknownKey: 1 })).toThrow(
      "[unknownKey]: Additional properties are not allowed ('unknownKey' was unexpected)"
    );
  });
});
