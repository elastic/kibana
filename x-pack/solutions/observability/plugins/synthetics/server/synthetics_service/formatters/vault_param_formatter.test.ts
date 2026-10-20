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
  findMalformedVaultReferences,
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

  it('extracts connection, path and field from references', () => {
    expect(extractVaultReferences('a=vault://p@one/two#a b=vault://q@three#b')).toEqual([
      { connection: 'p', path: 'one/two', field: 'a' },
      { connection: 'q', path: 'three', field: 'b' },
    ]);
  });

  it('reports a reference without a connection name as undefined', () => {
    expect(extractVaultReferences('vault://myapp/creds#password')).toEqual([
      { connection: undefined, path: 'myapp/creds', field: 'password' },
    ]);
  });

  it('parses the named connection@ form', () => {
    expect(extractVaultReferences('vault://staging@myapp/creds#password')).toEqual([
      { connection: 'staging', path: 'myapp/creds', field: 'password' },
    ]);
  });

  it('collects referenced connection names (undefined = unnamed)', () => {
    const v = 'a=vault://prod@x/y#a;b=vault://z#b;c=vault://prod@m/n#c';
    expect(referencedConnectionNames(v)).toEqual(new Set(['prod', undefined]));
    expect(referencedConnectionNames({ h: 'vault://staging@a/b#c' })).toEqual(new Set(['staging']));
  });
});

describe('findMalformedVaultReferences', () => {
  it.each([
    ['a percent-encoded path', 'https://x/?k=vault://prod@payments%2Fstripe#api_key'],
    ['a percent-encoded connection name', 'vault://pr%6Fd@a#b'],
    ['a tilde', 'vault://prod@a#b~c'],
    ['a second "#"', 'vault://prod@a#b#c'],
    ['a second "@"', 'vault://prod@a@b#c'],
    ['a missing field', 'vault://prod@a'],
    ['a bare scheme', 'see vault://'],
  ])('flags %s', (_label, value) => {
    expect(findMalformedVaultReferences(value)).not.toEqual([]);
  });

  it('returns the offending token', () => {
    expect(findMalformedVaultReferences('x=vault://prod@a%2Fb#c y')).toEqual([
      'vault://prod@a%2Fb#c',
    ]);
  });

  it.each([
    'vault://prod@myapp/creds#password',
    'Bearer vault://prod@tokens/api#value',
    'a=vault://p@one/two#a;b=vault://q@three#b',
    'no references here',
    'xvault://a%2Fb#c',
  ])('accepts %s', (value) => {
    expect(findMalformedVaultReferences(value)).toEqual([]);
  });

  it('scans objects', () => {
    expect(findMalformedVaultReferences({ h: { auth: 'vault://p@a%2Fb#c' } })).toEqual([
      'vault://p@a%2Fb#c',
    ]);
    expect(findMalformedVaultReferences({ h: 'vault://p@a/b#c' })).toEqual([]);
    expect(findMalformedVaultReferences(undefined)).toEqual([]);
  });
});

describe('buildVaultReference', () => {
  it('builds the named form and strips outer slashes', () => {
    expect(buildVaultReference('/myapp/creds/', 'password', 'staging')).toBe(
      'vault://staging@myapp/creds#password'
    );
  });

  it('round-trips with extractVaultReferences', () => {
    expect(extractVaultReferences(buildVaultReference('myapp/creds', 'password', 'prod'))).toEqual([
      { connection: 'prod', path: 'myapp/creds', field: 'password' },
    ]);
  });

  it('refuses input that would escape the opaque token', () => {
    expect(() => buildVaultReference('p', 'f}${otherParam', 'c')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('p', 'a#b', 'c')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('p', 'a@b', 'c')).toThrow(/Invalid Vault field/);
    expect(() => buildVaultReference('a#b', 'f', 'c')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('a b', 'f', 'c')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('p', 'f', 'na@me')).toThrow(/Invalid Vault connection name/);
    expect(() => buildVaultReference('p', 'f', '')).toThrow(/Invalid Vault connection name/);
  });

  it('refuses "." and ".." path segments, which Heartbeat rejects', () => {
    expect(() => buildVaultReference('a/../b', 'f', 'c')).toThrow(/Invalid Vault path/);
    expect(() => buildVaultReference('./a', 'f', 'c')).toThrow(/Invalid Vault path/);
    expect(buildVaultReference('a/.b/c..d', 'f', 'c')).toBe('vault://c@a/.b/c..d#f');
  });
});

describe('VaultParamSourceSchema', () => {
  const valid = (v: unknown) => VaultParamSourceSchema.safeParse(v).success;

  it('accepts a valid vault source', () => {
    expect(
      valid({ type: 'vault', path: 'myapp/creds', field: 'password', connection: 'staging' })
    ).toBe(true);
  });

  it('requires a connection', () => {
    expect(valid({ type: 'vault', path: 'myapp/creds', field: 'password' })).toBe(false);
    expect(valid({ type: 'vault', path: 'myapp/creds', field: 'password', connection: '' })).toBe(
      false
    );
  });

  it('rejects hostile path/field/connection', () => {
    expect(valid({ type: 'vault', path: 'a', field: 'f}${x', connection: 'c' })).toBe(false);
    expect(valid({ type: 'vault', path: 'a#b', field: 'f', connection: 'c' })).toBe(false);
    expect(valid({ type: 'vault', path: 'a/../b', field: 'f', connection: 'c' })).toBe(false);
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
