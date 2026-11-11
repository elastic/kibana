/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HashiCorpVaultConfig } from '../../../../common/runtime_types';
import { isCredentialSensitiveChange } from './credential_guard';

const base: HashiCorpVaultConfig = {
  address: 'https://vault.example.com',
  authMethod: 'token',
  kvMount: 'secret',
};

describe('isCredentialSensitiveChange', () => {
  it.each([
    ['address', { address: 'https://evil.example.com' }],
    ['auth method', { authMethod: 'approle' as const }],
    ['tlsSkipVerify turned on', { tlsSkipVerify: true }],
  ])('flags a change of %s', (_name, change) => {
    expect(isCredentialSensitiveChange(base, { ...base, ...change })).toBe(true);
  });

  it.each([
    ['kvMount', { kvMount: 'kv' }],
    ['namespace', { namespace: 'team-a' }],
    ['roleId', { roleId: 'role' }],
  ])('allows a change of %s', (_name, change) => {
    expect(isCredentialSensitiveChange(base, { ...base, ...change })).toBe(false);
  });

  it('treats an omitted option and false as the same', () => {
    expect(isCredentialSensitiveChange(base, { ...base, tlsSkipVerify: false })).toBe(false);
  });

  it('flags an unknown new field', () => {
    const next = { ...base, futureField: 'x' } as HashiCorpVaultConfig;
    expect(isCredentialSensitiveChange(base, next)).toBe(true);
  });

  describe('allowedMonitorHosts', () => {
    const restricted = { ...base, allowedMonitorHosts: ['a.example.com', 'b.example.com'] };

    it('allows narrowing the list', () => {
      expect(
        isCredentialSensitiveChange(restricted, { ...base, allowedMonitorHosts: ['a.example.com'] })
      ).toBe(false);
    });

    it('allows resaving an unchanged list', () => {
      expect(
        isCredentialSensitiveChange(restricted, {
          ...base,
          allowedMonitorHosts: ['a.example.com', 'b.example.com'],
        })
      ).toBe(false);
    });

    it('flags allowing another host', () => {
      expect(
        isCredentialSensitiveChange(restricted, {
          ...base,
          allowedMonitorHosts: ['a.example.com', 'c.example.com'],
        })
      ).toBe(true);
    });

    it.each([
      ['omitted', undefined],
      ['empty', []],
    ])('flags removing the restriction (%s)', (_name, allowedMonitorHosts) => {
      expect(isCredentialSensitiveChange(restricted, { ...base, allowedMonitorHosts })).toBe(true);
    });

    it('allows adding a restriction to an unrestricted connection', () => {
      expect(isCredentialSensitiveChange(base, restricted)).toBe(false);
    });
  });
});
