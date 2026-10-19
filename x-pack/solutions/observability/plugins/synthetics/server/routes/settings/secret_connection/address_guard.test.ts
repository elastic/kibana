/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isBlockedAddress, validateVaultAddress } from './address_guard';

describe('validateVaultAddress', () => {
  it.each([
    'https://vault.example.com',
    'http://localhost:8200',
    'http://10.0.0.5:8200/',
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
    ['http://169.254.169.254', 'link-local'],
    ['http://[fe80::1]', 'link-local'],
    ['http://[::ffff:169.254.169.254]', 'link-local'],
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
