/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVaultReference, parseVaultReference } from './vault_reference';

describe('vault reference', () => {
  it('builds a reference, trimming input and outer slashes', () => {
    expect(buildVaultReference({ connection: ' prod ', path: '/myapp/creds/', field: 'pw ' })).toBe(
      'vault://prod@myapp/creds#pw'
    );
  });

  it('round-trips', () => {
    const parts = { connection: 'prod', path: 'myapp/creds', field: 'password' };
    expect(parseVaultReference(buildVaultReference(parts))).toEqual(parts);
  });

  it.each([
    'plain value',
    'Bearer vault://prod@myapp/creds#password',
    'vault://myapp/creds#password',
    'vault://prod@myapp/creds',
    'vault://prod@a%2Fb#c',
    undefined,
  ])('does not map %s to the form', (value) => {
    expect(parseVaultReference(value)).toBeUndefined();
  });
});
