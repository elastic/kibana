/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../constants/monitor_defaults';
import type { KerberosConfig, NtlmConfig } from '../runtime_types';
import { ConfigKey } from '../runtime_types';

interface HttpAuthFields {
  [ConfigKey.KERBEROS]?: Partial<KerberosConfig> | null;
  [ConfigKey.NTLM]?: Partial<NtlmConfig> | null;
}

/**
 * Shallow-spreading a monitor over DEFAULT_FIELDS replaces nested `kerberos` /
 * `ntlm` wholesale. Merge so a partial auth block keeps default knobs.
 */
export const mergeHttpAuthDefaults = <T extends HttpAuthFields>(fields: T): T => {
  const kerberosDefaults = DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS];
  const ntlmDefaults = DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM];

  return {
    ...fields,
    [ConfigKey.KERBEROS]: {
      ...kerberosDefaults,
      ...(fields[ConfigKey.KERBEROS] ?? {}),
    },
    [ConfigKey.NTLM]: {
      ...ntlmDefaults,
      ...(fields[ConfigKey.NTLM] ?? {}),
    },
  };
};
