/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../constants/monitor_defaults';
import type { KerberosConfig, NtlmConfig } from '../runtime_types';
import { ConfigKey, KerberosAuthType } from '../runtime_types';

interface HttpAuthFields {
  [ConfigKey.KERBEROS]?: Partial<KerberosConfig> | null;
  [ConfigKey.NTLM]?: Partial<NtlmConfig> | null;
}

/** Clear the credential for the inactive Kerberos auth method so agents never get both. */
const stripInactiveKerberosCredential = (kerberos: KerberosConfig): KerberosConfig => {
  if (kerberos.auth_type === KerberosAuthType.KEYTAB) {
    return { ...kerberos, password: '' };
  }
  return { ...kerberos, keytab: '' };
};

/**
 * Shallow-spreading a monitor over DEFAULT_FIELDS replaces nested `kerberos` /
 * `ntlm` wholesale. Merge so a partial auth block keeps default knobs.
 * Disabled blocks reset to defaults so leftover secrets are not persisted.
 */
export const mergeHttpAuthDefaults = <T extends HttpAuthFields>(fields: T): T => {
  const kerberosDefaults = DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS];
  const ntlmDefaults = DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM];

  // Defaults supply every required key; Partial/null overlay keeps the full shape.
  const kerberos = {
    ...kerberosDefaults,
    ...(fields[ConfigKey.KERBEROS] ?? {}),
  } as KerberosConfig;

  const ntlm = {
    ...ntlmDefaults,
    ...(fields[ConfigKey.NTLM] ?? {}),
  } as NtlmConfig;

  return {
    ...fields,
    [ConfigKey.KERBEROS]: kerberos.enabled
      ? stripInactiveKerberosCredential(kerberos)
      : { ...kerberosDefaults },
    [ConfigKey.NTLM]: ntlm.enabled ? ntlm : { ...ntlmDefaults },
  };
};
