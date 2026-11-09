/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { config, configSchema } from './config';

const KEY_A = 'a'.repeat(32);
const KEY_B = 'b'.repeat(32);

describe('alertzero config huntLibrary keys', () => {
  it('leaves both keys unset by default', () => {
    const { huntLibrary } = configSchema.validate({});

    expect(huntLibrary.profileTokenKey).toBeUndefined();
    expect(huntLibrary.fingerprintKey).toBeUndefined();
  });

  it('accepts distinct keys', () => {
    const { huntLibrary } = configSchema.validate({
      huntLibrary: { profileTokenKey: KEY_A, fingerprintKey: KEY_B },
    });

    expect(huntLibrary.profileTokenKey).toBe(KEY_A);
  });

  it('rejects a profile token key equal to the fingerprint key', () => {
    expect(() =>
      configSchema.validate({ huntLibrary: { profileTokenKey: KEY_A, fingerprintKey: KEY_A } })
    ).toThrow('profileTokenKey must differ from fingerprintKey');
  });

  it('rejects a profile token key shorter than 32 characters', () => {
    expect(() => configSchema.validate({ huntLibrary: { profileTokenKey: 'short' } })).toThrow();
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
