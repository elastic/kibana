/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  normalizeSandboxAllowlistHost,
  validateSandboxAllowlist,
} from './sandbox_allowlist';

describe('normalizeSandboxAllowlistHost', () => {
  it.each([
    ['api.github.com', 'api.github.com'],
    ['  API.GitHub.com  ', 'api.github.com'],
    ['api.github.com.', 'api.github.com'],
    ['bücher.example', 'xn--bcher-kva.example'],
    ['localhost', 'localhost'],
    ['10.0.0.1', '10.0.0.1'],
  ])('normalizes %p to %p', (raw, expected) => {
    expect(normalizeSandboxAllowlistHost(raw)).toEqual({ host: expected });
  });

  it.each([
    ['', 'must not be empty'],
    ['*.github.com', 'wildcards'],
    ['*', 'wildcards'],
    ['https://api.github.com', 'scheme, port, path'],
    ['api.github.com:443', 'scheme, port, path'],
    ['api.github.com/v3', 'scheme, port, path'],
    ['user@api.github.com', 'scheme, port, path'],
    ['api github.com', 'scheme, port, path'],
    ['[::1]', 'scheme, port, path'],
    ['-api.github.com', 'not a valid hostname'],
    ['api..github.com', 'not a valid hostname'],
    ['api_github.com', 'not a valid hostname'],
    [`${'a'.repeat(64)}.com`, 'not a valid hostname'],
  ])('rejects %p', (raw, expectedError) => {
    const result = normalizeSandboxAllowlistHost(raw);
    expect(result).toEqual({ error: expect.stringContaining(expectedError) });
  });
});

describe('validateSandboxAllowlist', () => {
  it('normalizes, de-duplicates and skips blank lines', () => {
    expect(
      validateSandboxAllowlist(['api.github.com', '', 'API.GITHUB.COM.', 'uploads.github.com'])
    ).toEqual({ hosts: ['api.github.com', 'uploads.github.com'], errors: [] });
  });

  it('reports every invalid entry', () => {
    const { errors } = validateSandboxAllowlist(['*.github.com', 'ok.example', 'http://x.y']);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("'*.github.com'");
    expect(errors[1]).toContain("'http://x.y'");
  });

  it(`rejects more than ${MAX_SANDBOX_ALLOWLIST_HOSTS} distinct hosts`, () => {
    const hosts = Array.from(
      { length: MAX_SANDBOX_ALLOWLIST_HOSTS + 1 },
      (_, index) => `h${index}.example`
    );
    expect(validateSandboxAllowlist(hosts).errors).toEqual([
      expect.stringContaining(`At most ${MAX_SANDBOX_ALLOWLIST_HOSTS} hosts`),
    ]);
    expect(validateSandboxAllowlist(hosts.slice(1)).errors).toEqual([]);
  });

  it('counts the limit after de-duplication', () => {
    const hosts = Array.from({ length: MAX_SANDBOX_ALLOWLIST_HOSTS + 5 }, () => 'a.example');
    expect(validateSandboxAllowlist(hosts)).toEqual({ hosts: ['a.example'], errors: [] });
  });
});
