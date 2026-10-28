/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lookup as dnsLookup } from 'dns';
import {
  getAllowedHosts,
  guardedLookup,
  isAddressHostAllowed,
  isBlockedAddress,
  isLoopbackHost,
  validateVaultAddress,
} from './address_guard';
import type { UptimeConfig } from '../../../config';

jest.mock('dns', () => ({ lookup: jest.fn() }));
const dnsLookupMock = dnsLookup as unknown as jest.Mock;

describe('validateVaultAddress', () => {
  it.each([
    'https://vault.example.com',
    'http://localhost:8200',
    'http://127.0.0.1:8200',
    'http://[::1]:8200',
    'https://10.0.0.5:8200/',
    'https://vault.example.com:8200/prefix',
  ])('accepts %s', (address) => {
    expect(validateVaultAddress(address)).toBeUndefined();
  });

  it.each([
    ['https://vault.example.com#', 'fragment'],
    ['https://vault.example.com/#/v1/sys/health', 'fragment'],
    ['https://vault.example.com?x=1', 'query'],
    ['https://user:pass@vault.example.com', 'credentials'],
    ['ftp://vault.example.com', 'protocol'],
    ['not a url', 'invalid'],
    ['http://10.0.0.5:8200', 'plaintext to a remote host'],
    ['http://vault.example.com', 'plaintext to a remote host'],
    ['https://169.254.169.254', 'link-local'],
    ['https://[fe80::1]', 'link-local'],
    ['https://[::ffff:169.254.169.254]', 'link-local'],
  ])('rejects %s (%s)', (address) => {
    expect(validateVaultAddress(address)).toEqual(expect.any(String));
  });
});

describe('isBlockedAddress', () => {
  it.each(['169.254.169.254', '0.0.0.0', '::', 'fe80::1', 'fd00:ec2::254'])('blocks %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(['127.0.0.1', '10.1.2.3', '192.168.1.1', '::1', '8.8.8.8'])('allows %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe('isLoopbackHost', () => {
  it.each(['localhost', 'LOCALHOST', '127.0.0.1', '127.1.2.3', '::1', '[::1]'])(
    'treats %s as loopback',
    (host) => {
      expect(isLoopbackHost(host)).toBe(true);
    }
  );

  it.each(['vault.example.com', '10.0.0.5', '169.254.169.254', '0.0.0.0'])(
    'does not treat %s as loopback',
    (host) => {
      expect(isLoopbackHost(host)).toBe(false);
    }
  );
});

describe('guardedLookup', () => {
  const resolveWith = (result: unknown, error: Error | null = null) =>
    dnsLookupMock.mockImplementation((_host, _options, callback) => {
      if (error) callback(error);
      else callback(null, result, 4);
    });

  const lookup = (options = {}) =>
    new Promise<{ err: Error | null; address: unknown }>((resolve) => {
      guardedLookup('vault.example.com', options, (err, address) => resolve({ err, address }));
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes through an allowed address', async () => {
    resolveWith('10.1.2.3');

    expect(await lookup()).toEqual({ err: null, address: '10.1.2.3' });
  });

  it('rejects a name that resolves to a link-local address', async () => {
    resolveWith('169.254.169.254');

    const { err } = await lookup();

    expect(err?.message).toBe('address resolves to a blocked link-local IP');
  });

  it('rejects when any of several resolved addresses is blocked', async () => {
    resolveWith([
      { address: '10.1.2.3', family: 4 },
      { address: '169.254.169.254', family: 4 },
    ]);

    const { err } = await lookup({ all: true });

    expect(err).toBeInstanceOf(Error);
  });

  it('forwards a resolver error', async () => {
    resolveWith(undefined, new Error('ENOTFOUND'));

    const { err } = await lookup();

    expect(err?.message).toBe('ENOTFOUND');
  });
});

describe('isAddressHostAllowed', () => {
  it('allows any host with the wildcard', () => {
    expect(isAddressHostAllowed('https://anything.example.com', ['*'])).toBe(true);
  });

  it('matches the exact host, ignoring case, port, path and scheme', () => {
    const allowed = ['Vault.Corp.example.com'];
    expect(isAddressHostAllowed('https://vault.corp.example.com:8200/prefix', allowed)).toBe(true);
    expect(isAddressHostAllowed('http://vault.corp.example.com', allowed)).toBe(true);
  });

  it('rejects other hosts, including subdomains and lookalikes', () => {
    const allowed = ['vault.corp.example.com'];
    expect(isAddressHostAllowed('https://attacker.example', allowed)).toBe(false);
    expect(isAddressHostAllowed('https://x.vault.corp.example.com', allowed)).toBe(false);
    expect(isAddressHostAllowed('https://vault.corp.example.com.attacker.example', allowed)).toBe(
      false
    );
  });

  it('matches IPv6 hosts with or without brackets in the list', () => {
    expect(isAddressHostAllowed('http://[::1]:8200', ['[::1]'])).toBe(true);
    expect(isAddressHostAllowed('http://[::1]:8200', ['::1'])).toBe(true);
  });

  it('rejects everything for an empty list or an unparsable address', () => {
    expect(isAddressHostAllowed('https://vault.example.com', [])).toBe(false);
    expect(isAddressHostAllowed('not a url', ['vault.example.com'])).toBe(false);
  });
});

describe('getAllowedHosts', () => {
  it('defaults to any host when unset', () => {
    expect(getAllowedHosts({} as UptimeConfig)).toEqual(['*']);
  });

  it('returns the configured list', () => {
    const config = { secretConnections: { allowedHosts: ['a.example.com'] } } as UptimeConfig;
    expect(getAllowedHosts(config)).toEqual(['a.example.com']);
  });
});
