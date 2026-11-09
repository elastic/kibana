/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config, configSchema } from './config';

const KEY = 'a'.repeat(32);

describe('alertzero config huntLibrary key', () => {
  it('leaves the fingerprint key unset by default', () => {
    expect(configSchema.validate({}).huntLibrary.fingerprintKey).toBeUndefined();
  });

  it('accepts a fingerprint key', () => {
    const { huntLibrary } = configSchema.validate({ huntLibrary: { fingerprintKey: KEY } });

    expect(huntLibrary.fingerprintKey).toBe(KEY);
  });

  it('rejects a fingerprint key shorter than 32 characters', () => {
    expect(() => configSchema.validate({ huntLibrary: { fingerprintKey: 'short' } })).toThrow();
  });
});

describe('alertzero config', () => {
  it('turns the plugin on by default in traditional deployments', () => {
    expect(config.schema.validate({}, { serverless: false })).toMatchObject({ enabled: true });
  });

  it('keeps the plugin off by default in serverless', () => {
    expect(config.schema.validate({}, { serverless: true })).toMatchObject({ enabled: false });
  });
});
