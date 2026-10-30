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
    ['*.datadoghq.com', '*.datadoghq.com'],
    ['api.github.com:443', 'allow api.github.com:443'],
    ['pypi.org GET,HEAD /simple/', 'allow pypi.org GET,HEAD /simple/'],
    ['deny api.github.com POST /gists # block gists', 'deny api.github.com POST /gists'],
    ['allow https api.github.com:443 post,get /', 'allow https api.github.com:443 GET,POST'],
  ])('normalizes %p to %p', (raw, expected) => {
    expect(normalizeSandboxAllowlistHost(raw)).toEqual({ host: expected });
  });

  it.each([
    ['', 'must not be empty'],
    ['# comment only', 'must not be empty'],
    ['*', 'bare wildcard'],
    ['*.com', 'wildcard must be of the form *.example.com'],
    ['https://api.github.com', 'must not include a URL scheme prefix'],
    ['api.github.com:99999', 'invalid port'],
    ['api.github.com/v3', 'bare hostname'],
    ['user@api.github.com', 'bare hostname'],
    ['api github.com', 'unsupported HTTP method'],
    ['api.github.com GET relative/path', "must start with '/'"],
    ['[::1]', 'bare hostname'],
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
  it('normalizes, de-duplicates and skips blank and comment lines', () => {
    expect(
      validateSandboxAllowlist([
        'api.github.com',
        '',
        '# comment',
        'API.GITHUB.COM.',
        '*.datadoghq.com',
        'deny api.github.com POST /gists',
      ])
    ).toEqual({
      hosts: ['api.github.com', '*.datadoghq.com', 'deny api.github.com POST /gists'],
      errors: [],
    });
  });

  it('reports every invalid entry', () => {
    const { errors } = validateSandboxAllowlist(['*.com', 'ok.example', 'http://x.y']);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain("'*.com'");
    expect(errors[1]).toContain("'http://x.y'");
  });

  it(`rejects more than ${MAX_SANDBOX_ALLOWLIST_HOSTS} distinct rules`, () => {
    const hosts = Array.from(
      { length: MAX_SANDBOX_ALLOWLIST_HOSTS + 1 },
      (_, index) => `h${index}.example`
    );
    expect(validateSandboxAllowlist(hosts).errors).toEqual([
      expect.stringContaining(`At most ${MAX_SANDBOX_ALLOWLIST_HOSTS} rules`),
    ]);
    expect(validateSandboxAllowlist(hosts.slice(1)).errors).toEqual([]);
  });

  it('counts the limit after de-duplication', () => {
    const hosts = Array.from({ length: MAX_SANDBOX_ALLOWLIST_HOSTS + 5 }, () => 'a.example');
    expect(validateSandboxAllowlist(hosts)).toEqual({ hosts: ['a.example'], errors: [] });
  });
});
