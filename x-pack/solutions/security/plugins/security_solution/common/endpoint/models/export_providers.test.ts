/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import type { ExportProvider, PolicyConfig } from '../types';
import { policyFactory } from './policy_config';
import {
  getExportProviders,
  setExportProviders,
  removeExportProviders,
  hasExportProviders,
  getExportProviderKeyIds,
} from './export_providers';

const AZURE_PROVIDER: ExportProvider = {
  id: 'azure-1',
  type: 'azure_blob',
  account_name: 'myaccount',
  container: 'my-container',
};

describe('getExportProviders', () => {
  it('reads providers from windows', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [AZURE_PROVIDER] });

    expect(getExportProviders(policy)).toEqual([AZURE_PROVIDER]);
  });

  it('returns an empty array when response_actions is absent', () => {
    expect(getExportProviders(policyFactory())).toEqual([]);
  });
});

describe('setExportProviders', () => {
  it('writes its own copy of the list to windows, mac and linux without mutating the input', () => {
    const policy = policyFactory();
    const originalPolicy = JSON.parse(JSON.stringify(policy));
    const providers = [AZURE_PROVIDER];
    const originalProviders = JSON.parse(JSON.stringify(providers));

    const result = setExportProviders(policy, providers);

    expect(result.windows.response_actions?.export_providers).toEqual([AZURE_PROVIDER]);
    expect(result.mac.response_actions?.export_providers).toEqual([AZURE_PROVIDER]);
    expect(result.linux.response_actions?.export_providers).toEqual([AZURE_PROVIDER]);
    expect(policy).toEqual(originalPolicy);
    expect(providers).toEqual(originalProviders);

    const lists = [result.windows, result.mac, result.linux].map(
      (os) => os.response_actions?.export_providers
    );
    expect(new Set([...lists, providers]).size).toBe(4);
  });

  it('removes response_actions from every OS when given an empty list', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [AZURE_PROVIDER] });
    set(policy, 'mac.response_actions', { export_providers: [AZURE_PROVIDER] });
    set(policy, 'linux.response_actions', { export_providers: [AZURE_PROVIDER] });

    const result = setExportProviders(policy, []);

    expect(result.windows).not.toHaveProperty('response_actions');
    expect(result.mac).not.toHaveProperty('response_actions');
    expect(result.linux).not.toHaveProperty('response_actions');
  });
});

describe('removeExportProviders', () => {
  let policy: PolicyConfig;

  beforeEach(() => {
    policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [AZURE_PROVIDER] });
    set(policy, 'mac.response_actions', { export_providers: [AZURE_PROVIDER] });
    set(policy, 'linux.response_actions', { export_providers: [AZURE_PROVIDER] });
  });

  it.each(['windows', 'mac', 'linux'] as const)('removes response_actions from %s', (os) => {
    const result = removeExportProviders(policy);

    expect(result[os]).not.toHaveProperty('response_actions');
  });

  it.each(['windows', 'mac', 'linux'] as const)('preserves all other %s fields', (os) => {
    const result = removeExportProviders(policy);
    const { response_actions: _removed, ...rest } = policy[os];

    expect(result[os]).toEqual(rest);
  });

  it('preserves global fields unchanged', () => {
    const result = removeExportProviders(policy);

    expect(result.global_manifest_version).toEqual(policy.global_manifest_version);
    expect(result.global_telemetry_enabled).toEqual(policy.global_telemetry_enabled);
    expect(result.meta).toEqual(policy.meta);
  });

  it('returns a new policy object without mutating the original', () => {
    const originalPolicy = JSON.parse(JSON.stringify(policy));

    const result = removeExportProviders(policy);

    expect(policy).toEqual(originalPolicy);
    expect(result).not.toBe(policy);
    expect(result.windows).not.toBe(policy.windows);
    expect(result.mac).not.toBe(policy.mac);
    expect(result.linux).not.toBe(policy.linux);
  });

  it.each(['windows', 'mac', 'linux'] as const)(
    'removes the whole response_actions on %s, including other settings',
    (os) => {
      set(policy, `${os}.response_actions.other_setting`, true);

      const result = removeExportProviders(policy);

      expect(result[os]).not.toHaveProperty('response_actions');
    }
  );

  it('removes a response_actions that is not an object', () => {
    set(policy, 'windows.response_actions', 'not-an-object');

    const result = removeExportProviders(policy);

    expect(result.windows).not.toHaveProperty('response_actions');
  });

  it('tolerates a linux branch that is missing', () => {
    Reflect.deleteProperty(policy, 'linux');

    const result = removeExportProviders(policy);

    expect(result.linux).toBeUndefined();
  });

  it('tolerates a linux branch that is not an object', () => {
    set(policy, 'linux', 'not-an-object');

    const result = removeExportProviders(policy);

    expect(result.linux).toBe('not-an-object');
  });
});

describe('hasExportProviders', () => {
  it('returns false for a policy without response_actions', () => {
    expect(hasExportProviders(policyFactory())).toBe(false);
  });

  it('returns true when windows has a non-empty export_providers array', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [AZURE_PROVIDER] });

    expect(hasExportProviders(policy)).toBe(true);
  });

  it('returns true when only mac has a non-empty export_providers array', () => {
    const policy = policyFactory();
    set(policy, 'mac.response_actions', { export_providers: [AZURE_PROVIDER] });

    expect(hasExportProviders(policy)).toBe(true);
  });

  it('returns false when export_providers is an empty array', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [] });

    expect(hasExportProviders(policy)).toBe(false);
  });

  it('returns false when export_providers is an object rather than an array', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: { id: 'azure-1' } });

    expect(hasExportProviders(policy)).toBe(false);
  });

  it('returns false when export_providers is a string', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: 'azure-1' });

    expect(hasExportProviders(policy)).toBe(false);
  });

  it('tolerates a windows branch that is not an object', () => {
    const policy = policyFactory();
    set(policy, 'windows', 'not-an-object');

    expect(hasExportProviders(policy)).toBe(false);
  });
});

describe('getExportProviderKeyIds', () => {
  const withKeyId = (keyId: unknown): ExportProvider =>
    ({ ...AZURE_PROVIDER, credentials: { type: 'account_key', key_id: keyId } } as ExportProvider);

  it('returns an empty set for a policy without export providers', () => {
    expect(getExportProviderKeyIds(policyFactory())).toEqual(new Set());
  });

  it.each(['windows', 'mac', 'linux'] as const)('collects the key_id from %s', (os) => {
    const policy = policyFactory();
    set(policy, `${os}.response_actions`, { export_providers: [withKeyId('key-1')] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set(['key-1']));
  });

  it('collects key_ids from every OS and dedupes them', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [withKeyId('key-1')] });
    set(policy, 'mac.response_actions', { export_providers: [withKeyId('key-1')] });
    set(policy, 'linux.response_actions', { export_providers: [withKeyId('key-2')] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set(['key-1', 'key-2']));
  });

  it('ignores a provider with no credentials', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [AZURE_PROVIDER] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set());
  });

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['empty string', ''],
    ['a number', 1],
    ['an object', {}],
  ])('ignores a key_id that is %s', (_desc, keyId) => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: [withKeyId(keyId)] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set());
  });

  it('ignores a provider that is not an object', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: ['not-an-object'] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set());
  });

  it('ignores an export_providers list that is not an array', () => {
    const policy = policyFactory();
    set(policy, 'windows.response_actions', { export_providers: 'not-an-array' });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set());
  });

  it('tolerates an OS branch that is not an object', () => {
    const policy = policyFactory();
    set(policy, 'windows', 'not-an-object');
    set(policy, 'mac.response_actions', { export_providers: [withKeyId('key-1')] });

    expect(getExportProviderKeyIds(policy)).toEqual(new Set(['key-1']));
  });
});
