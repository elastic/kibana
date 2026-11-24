/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, isObject, isPlainObject, omit } from 'lodash';
import type { ExportProvider, ExportProviderCredentials, PolicyConfig } from '../types';

type PolicyOsConfig = PolicyConfig['windows'] | PolicyConfig['mac'] | PolicyConfig['linux'];

/** The providers of a policy; the three OS lists are always identical, so this reads from `windows`. */
export const getExportProviders = (policy: PolicyConfig): ExportProvider[] => [
  ...(policy.windows?.response_actions?.export_providers ?? []),
];

/**
 * `os` without `response_actions.export_providers`. `response_actions` is dropped too once nothing
 * else is left in it, or when it isn't an object. The policy may come from an unvalidated API
 * payload, so a malformed OS branch is left as is.
 */
const withoutExportProviders = <OsConfig extends PolicyOsConfig>(os: OsConfig): OsConfig => {
  if (!isObject(os) || !('response_actions' in os)) {
    return os;
  }

  const responseActions = isPlainObject(os.response_actions)
    ? omit(os.response_actions, 'export_providers')
    : {};

  return isEmpty(responseActions)
    ? (omit(os, 'response_actions') as OsConfig)
    : { ...os, response_actions: responseActions };
};

/**
 * Returns a copy of `policy` without `export_providers` on any OS (feature flag / license strip).
 * Other `response_actions` settings are kept; an empty `response_actions` is removed.
 */
export const removeExportProviders = (policy: PolicyConfig): PolicyConfig => ({
  ...policy,
  windows: withoutExportProviders(policy.windows),
  mac: withoutExportProviders(policy.mac),
  linux: withoutExportProviders(policy.linux),
});

/**
 * Returns a copy of `policy` with `providers` written to windows, mac and linux.
 * An empty list removes them like `removeExportProviders`.
 */
export const setExportProviders = (
  policy: PolicyConfig,
  providers: readonly ExportProvider[]
): PolicyConfig => {
  if (providers.length === 0) {
    return removeExportProviders(policy);
  }

  return {
    ...policy,
    windows: {
      ...policy.windows,
      response_actions: { ...policy.windows.response_actions, export_providers: [...providers] },
    },
    mac: {
      ...policy.mac,
      response_actions: { ...policy.mac.response_actions, export_providers: [...providers] },
    },
    linux: {
      ...policy.linux,
      response_actions: { ...policy.linux.response_actions, export_providers: [...providers] },
    },
  };
};

/** `os` may come from an unvalidated API payload, so tolerate a malformed branch or field. */
const hasNonEmptyExportProvidersArray = (os: PolicyOsConfig): boolean => {
  if (!isObject(os)) {
    return false;
  }
  const { export_providers: exportProviders } = os.response_actions ?? {};
  return Array.isArray(exportProviders) && exportProviders.length > 0;
};

/**
 * Whether any OS of the policy has a non-empty `export_providers` array. Gating checks run
 * before structural validation, so this tolerates malformed input.
 */
export const hasExportProviders = (policy: PolicyConfig): boolean =>
  hasNonEmptyExportProvidersArray(policy.windows) ||
  hasNonEmptyExportProvidersArray(policy.mac) ||
  hasNonEmptyExportProvidersArray(policy.linux);

/**
 * Every `credentials.key_id` referenced by a provider of any OS. Tolerates malformed input, so a
 * caller deciding whether a stored key is still in use never misses a reference.
 */
export const getExportProviderKeyIds = (policy: PolicyConfig): Set<string> => {
  const keyIds = new Set<string>();

  for (const os of [policy.windows, policy.mac, policy.linux]) {
    const exportProviders: unknown = isObject(os) ? os.response_actions?.export_providers : [];

    if (Array.isArray(exportProviders)) {
      for (const provider of exportProviders as unknown[]) {
        const credentials: unknown = isObject(provider)
          ? (provider as Partial<ExportProvider>).credentials
          : undefined;
        const keyId: unknown = isObject(credentials)
          ? (credentials as Partial<ExportProviderCredentials>).key_id
          : undefined;

        if (typeof keyId === 'string' && keyId !== '') {
          keyIds.add(keyId);
        }
      }
    }
  }

  return keyIds;
};
