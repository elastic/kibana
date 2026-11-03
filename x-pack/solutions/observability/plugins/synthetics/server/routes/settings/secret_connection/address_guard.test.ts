/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAllowedHosts,
  isAddressHostAllowed,
  isBlockedAddress,
  validateVaultAddress,
} from './address_guard';
import type { UptimeConfig } from '../../../config';

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
