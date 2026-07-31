/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { replaceStringWithParams } from './formatting_utils';
import {
  hasVaultReference,
  valueContainsVaultReference,
  extractVaultReferences,
} from './vault_param_formatter';

describe('vault reference helpers', () => {
  it('detects vault references', () => {
    expect(hasVaultReference('${vault/myapp/creds#password}')).toBe(true);
    expect(hasVaultReference('Bearer ${vault/tokens/api#value}')).toBe(true);
    expect(hasVaultReference('${normalParam}')).toBe(false);
    expect(hasVaultReference('no refs here')).toBe(false);
  });

  it('detects vault references inside objects', () => {
    expect(valueContainsVaultReference({ headers: { auth: '${vault/x/y#z}' } })).toBe(true);
    expect(valueContainsVaultReference({ headers: { auth: 'static' } })).toBe(false);
    expect(valueContainsVaultReference(null)).toBe(false);
  });

  it('extracts path and field from references', () => {
    expect(extractVaultReferences('${vault/myapp/creds#password}')).toEqual([
      { path: 'myapp/creds', field: 'password' },
    ]);
    expect(extractVaultReferences('a=${vault/one/two#a} b=${vault/three#b}')).toEqual([
      { path: 'one/two', field: 'a' },
      { path: 'three', field: 'b' },
    ]);
  });
});

describe('replaceStringWithParams leaves vault references untouched', () => {
  const params = { environment: 'prod', apiHost: 'example.com' };

  it('passes a bare vault reference through unchanged', () => {
    const value = '${vault/myapp/creds#password}';
    expect(replaceStringWithParams(value, params)).toBe(value);
  });

  it('passes a vault reference embedded in a header value through unchanged', () => {
    const value = 'Bearer ${vault/tokens/api#value}';
    expect(replaceStringWithParams(value, params)).toBe(value);
  });

  it('resolves normal params but preserves vault references in the same value', () => {
    // Only the ${environment} param is resolved; the vault token is preserved
    // verbatim for edge resolution by Heartbeat.
    const value = 'env=${environment};secret=${vault/myapp/creds#password}';
    expect(replaceStringWithParams(value, params)).toBe(
      'env=prod;secret=${vault/myapp/creds#password}'
    );
  });

  it('preserves vault references inside object field values', () => {
    const value = { 'X-Secret': '${vault/myapp/creds#password}', host: '${apiHost}' };
    expect(replaceStringWithParams(value, params)).toEqual({
      'X-Secret': '${vault/myapp/creds#password}',
      host: 'example.com',
    });
  });
});
