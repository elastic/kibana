/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HashiCorpVaultConfig } from '../../../../common/runtime_types';
import { isNarrowerOrEqualHostList } from '../../../../common/lib/allowed_monitor_hosts';

// Everything else (address, auth method, TLS verification, and any field added later)
// can redirect the stored credential, so changing it requires re-entering the secret.
const FIELDS_SAFE_TO_CHANGE_WITHOUT_SECRET = new Set<keyof HashiCorpVaultConfig>([
  'kvMount',
  'namespace',
  'roleId',
  // Compared separately: narrowing the list is safe, widening it is not.
  'allowedMonitorHosts',
]);

// An omitted option and its falsy default are the same setting.
const normalize = (value: unknown): unknown =>
  value === undefined || value === false || value === '' ? null : value;

export const isCredentialSensitiveChange = (
  existing: HashiCorpVaultConfig,
  next: HashiCorpVaultConfig
): boolean => {
  const keys = new Set([...Object.keys(existing), ...Object.keys(next)]) as Set<
    keyof HashiCorpVaultConfig
  >;
  return (
    [...keys].some(
      (key) =>
        !FIELDS_SAFE_TO_CHANGE_WITHOUT_SECRET.has(key) &&
        normalize(existing[key]) !== normalize(next[key])
    ) ||
    // Widening the allowed monitor hosts lets monitors send the stored credential to more
    // places, so it needs the secret too.
    !isNarrowerOrEqualHostList(existing.allowedMonitorHosts, next.allowedMonitorHosts)
  );
};

export const SECRET_REENTRY_REQUIRED_MESSAGE =
  'The Vault secret must be re-entered when changing the connection address, auth method or TLS verification, or when allowing more monitor hosts.';
