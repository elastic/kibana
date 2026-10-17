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
  buildVaultReference,
  referencedConnectionNames,
  stripVaultConnectionNames,
  VaultParamSourceSchema,
} from './vault_param_formatter';

describe('vault reference helpers', () => {
  it('detects vault references', () => {
    expect(hasVaultReference('vault://myapp/creds#password')).toBe(true);
    expect(hasVaultReference('Bearer vault://tokens/api#value')).toBe(true);
    expect(hasVaultReference('${normalParam}')).toBe(false);
    expect(hasVaultReference('no refs here')).toBe(false);
  });

  it('only matches where Heartbeat would (left boundary)', () => {
    expect(hasVaultReference('xvault://a#b')).toBe(false);
    expect(hasVaultReference('https://host/vault://a#b')).toBe(true);
    expect(hasVaultReference('vault://missing-field')).toBe(false);
  });

  it('detects vault references inside objects', () => {
    expect(valueContainsVaultReference({ headers: { auth: 'vault://x/y#z' } })).toBe(true);
    expect(valueContainsVaultReference({ headers: { auth: 'static' } })).toBe(false);
    expect(valueContainsVaultReference(null)).toBe(false);
  });

  it('extracts path and field from references', () => {
    expect(extractVaultReferences('vault://myapp/creds#password')).toEqual([
      { connection: undefined, path: 'myapp/creds', field: 'password' },
    ]);
    expect(extractVaultReferences('a=vault://one/two#a b=vault://three#b')).toEqual([
      { connection: undefined, path: 'one/two', field: 'a' },
      { connection: undefined, path: 'three', field: 'b' },
    ]);
  });

  it('parses the named connection@ form', () => {
    expect(extractVaultReferences('vault://staging@myapp/creds#password')).toEqual([
      { connection: 'staging', path: 'myapp/creds', field: 'password' },
    ]);
  });

  it('collects referenced connection names (undefined = default)', () => {
    const v = 'a=vault://prod@x/y#a;b=vault://z#b;c=vault://prod@m/n#c';
    expect(referencedConnectionNames(v)).toEqual(new Set(['prod', undefined]));
    expect(referencedConnectionNames({ h: 'vault://staging@a/b#c' })).toEqual(new Set(['staging']));
  });
});

describe('stripVaultConnectionNames', () => {
  it('drops the connection prefix and keeps the rest of the value', () => {
    expect(stripVaultConnectionNames('Bearer vault://prod@myapp/api#token')).toBe(
      'Bearer vault://myapp/api#token'
    );
    expect(stripVaultConnectionNames('vault://myapp/api#token')).toBe('vault://myapp/api#token');
    expect(stripVaultConnectionNames('plain')).toBe('plain');
  });

  it('rewrites references inside objects and returns untouched objects as is', () => {
    expect(stripVaultConnectionNames({ h: { a: 'vault://prod@x#y' }, n: 1 })).toEqual({
      h: { a: 'vault://x#y' },
      n: 1,
    });
    const untouched = { h: 'static' };
    expect(stripVaultConnectionNames(untouched)).toBe(untouched);
    expect(stripVaultConnectionNames(null)).toBeNull();
  });

  it('rewrites references inside JSON strings (e.g. browser params)', () => {
    expect(stripVaultConnectionNames('{"pw":"vault://prod@x/y#z"}')).toBe('{"pw":"vault://x/y#z"}');
  });
});

describe('buildVaultReference', () => {
  it('builds the default and named forms and strips outer slashes', () => {
    expect(buildVaultReference('myapp/creds', 'password')).toBe('vault://myapp/creds#password');
    expect(buildVaultReference('/myapp/creds/', 'password', 'staging')).toBe(
      'vault://staging@myapp/creds#password'
    );
  });

  it('round-trips with extractVaultReferences', () => {
    expect(extractVaultReferences(buildVaultReference('myapp/creds', 'password'))).toEqual([
      { connection: undefined, path: 'myapp/creds', field: 'password' },
    ]);
    expect(extractVaultReferences(buildVaultReference('myapp/creds', 'password', 'prod'))).toEqual([
      { connection: 'prod', path: 'myapp/creds', field: 'password' },
    ]);
  });

  it('refuses input that would escape the opaque token', () => {
    expect(() => buildVaultReference('p', 'f}${otherParam')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('p', 'a#b')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('p', 'a@b')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('a#b', 'f')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('a b', 'f')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('p', 'f', 'na@me')).toThrow(/Invalid Vault connection name/);
  });

  it('refuses "." and ".." path segments, which Heartbeat rejects', () => {
    expect(() => buildVaultReference('a/../b', 'f')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('./a', 'f')).toThrow(/Invalid Vault path/);
    expect(buildVaultReference('a/.b/c..d', 'f')).toBe('vault://a/.b/c..d#f');
  });
});

describe('VaultParamSourceSchema', () => {
  const valid = (v: unknown) => VaultParamSourceSchema.safeParse(v).success;

  it('accepts a valid vault source (default and named)', () => {
    expect(valid({ type: 'vault', path: 'myapp/creds', field: 'password' })).toBe(true);
    expect(
      valid({ type: 'vault', path: 'myapp/creds', field: 'password', connection: 'staging' })
    ).toBe(true);
  });

  it('rejects hostile path/field/connection', () => {
    expect(valid({ type: 'vault', path: 'a', field: 'f}${x' })).toBe(false);
    expect(valid({ type: 'vault', path: 'a#b', field: 'f' })).toBe(false);
    expect(valid({ type: 'vault', path: 'a/../b', field: 'f' })).toBe(false);
    expect(valid({ type: 'vault', path: 'a', field: 'f', connection: 'na@me' })).toBe(false);
  });
});

describe('replaceStringWithParams leaves vault references untouched', () => {
  const params = { environment: 'prod', apiHost: 'example.com' };

  it('passes a bare vault reference through unchanged', () => {
    const value = 'vault://myapp/creds#password';
    expect(replaceStringWithParams(value, params)).toBe(value);
  });

  it('passes a vault reference embedded in a header value through unchanged', () => {
    const value = 'Bearer vault://tokens/api#value';
    expect(replaceStringWithParams(value, params)).toBe(value);
  });

  it('resolves normal params but preserves vault references in the same value', () => {
    const value = 'env=${environment};secret=vault://myapp/creds#password';
    expect(replaceStringWithParams(value, params)).toBe(
      'env=prod;secret=vault://myapp/creds#password'
    );
  });

  it('preserves vault references inside object field values', () => {
    const value = { 'X-Secret': 'vault://myapp/creds#password', host: '${apiHost}' };
    expect(replaceStringWithParams(value, params)).toEqual({
      'X-Secret': 'vault://myapp/creds#password',
      host: 'example.com',
    });
  });
});
