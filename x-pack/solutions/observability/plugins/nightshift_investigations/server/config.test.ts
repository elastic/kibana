/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config } from './config';

describe('Nightshift investigations configuration', () => {
  it('enables Cortex by default', () => {
    expect(config.schema.validate({ cortex: {} }).cortex.enabled).toBe(true);
  });

  it('preserves an explicit Cortex opt-out', () => {
    expect(config.schema.validate({ cortex: { enabled: false } }).cortex.enabled).toBe(false);
  });
});
