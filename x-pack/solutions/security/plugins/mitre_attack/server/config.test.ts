/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { configSchema } from './config';

describe('mitreAttack config', () => {
  it('defaults managedSourceEnabled to true', () => {
    expect(configSchema.validate({}).managedSourceEnabled).toBe(true);
  });

  it('allows managedSourceEnabled to be disabled', () => {
    expect(configSchema.validate({ managedSourceEnabled: false }).managedSourceEnabled).toBe(false);
  });
});
