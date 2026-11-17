/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, omit } from 'lodash';
import type { ExportProvider, PolicyConfig } from '../types';

/** The providers of a policy; the three OS lists are always identical, so this reads from `windows`. */
export const getExportProviders = (policy: PolicyConfig): ExportProvider[] => [
  ...(policy.windows?.response_actions?.export_providers ?? []),
];

/** Returns a copy of `policy` without `response_actions` on any OS (feature flag / license strip). */
export const removeExportProviders = (policy: PolicyConfig): PolicyConfig => ({
  ...policy,
  // The policy may come from an unvalidated API payload, so a malformed OS branch is left as is
  windows: isObject(policy.windows) ? omit(policy.windows, 'response_actions') : policy.windows,
  mac: isObject(policy.mac) ? omit(policy.mac, 'response_actions') : policy.mac,
  linux: isObject(policy.linux) ? omit(policy.linux, 'response_actions') : policy.linux,
});

/**
 * Returns a copy of `policy` with `providers` written to windows, mac and linux.
 * An empty list removes `response_actions` from every OS, like `removeExportProviders`.
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
const hasNonEmptyExportProvidersArray = (
  os: PolicyConfig['windows'] | PolicyConfig['mac'] | PolicyConfig['linux']
): boolean => {
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
