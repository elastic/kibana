/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../constants/monitor_defaults';
import { ConfigKey, KerberosAuthType } from '../runtime_types';
import { mergeHttpAuthDefaults } from './merge_http_auth_defaults';

describe('mergeHttpAuthDefaults', () => {
  it('fills omitted Kerberos/NTLM knobs from defaults', () => {
    const merged = mergeHttpAuthDefaults({
      [ConfigKey.KERBEROS]: {
        enabled: true,
        username: 'svc',
        password: 'secret',
        config_path: '/etc/krb5.conf',
      },
      [ConfigKey.NTLM]: {
        enabled: true,
        username: 'ntlm-user',
        password: 'ntlm-pass',
      },
    });

    expect(merged[ConfigKey.KERBEROS]).toEqual({
      ...DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS],
      enabled: true,
      username: 'svc',
      password: 'secret',
      config_path: '/etc/krb5.conf',
    });
    expect(merged[ConfigKey.NTLM]).toEqual({
      ...DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM],
      enabled: true,
      username: 'ntlm-user',
      password: 'ntlm-pass',
    });
  });

  it('uses full defaults when auth blocks are omitted', () => {
    expect(mergeHttpAuthDefaults({})).toEqual({
      [ConfigKey.KERBEROS]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS],
      [ConfigKey.NTLM]: DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM],
    });
  });

  it('clears password when Kerberos auth_type is keytab', () => {
    const merged = mergeHttpAuthDefaults({
      [ConfigKey.KERBEROS]: {
        enabled: true,
        auth_type: KerberosAuthType.KEYTAB,
        username: 'svc',
        password: 'stale-password',
        keytab: '/etc/krb5.keytab',
        config_path: '/etc/krb5.conf',
      },
    });

    expect(merged[ConfigKey.KERBEROS]).toMatchObject({
      auth_type: KerberosAuthType.KEYTAB,
      username: 'svc',
      password: '',
      keytab: '/etc/krb5.keytab',
    });
  });

  it('clears keytab when Kerberos auth_type is password', () => {
    const merged = mergeHttpAuthDefaults({
      [ConfigKey.KERBEROS]: {
        enabled: true,
        auth_type: KerberosAuthType.PASSWORD,
        username: 'svc',
        password: 'secret',
        keytab: '/etc/stale.keytab',
        config_path: '/etc/krb5.conf',
      },
    });

    expect(merged[ConfigKey.KERBEROS]).toMatchObject({
      auth_type: KerberosAuthType.PASSWORD,
      password: 'secret',
      keytab: '',
    });
  });

  it('resets disabled Kerberos/NTLM blocks to defaults (clears secrets)', () => {
    const merged = mergeHttpAuthDefaults({
      [ConfigKey.KERBEROS]: {
        enabled: false,
        auth_type: KerberosAuthType.PASSWORD,
        username: 'svc',
        password: 'stale-secret',
        config_path: '/etc/krb5.conf',
      },
      [ConfigKey.NTLM]: {
        enabled: false,
        username: 'ntlm-user',
        password: 'ntlm-pass',
        domain: 'EXAMPLE',
      },
    });

    expect(merged[ConfigKey.KERBEROS]).toEqual(DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.KERBEROS]);
    expect(merged[ConfigKey.NTLM]).toEqual(DEFAULT_HTTP_ADVANCED_FIELDS[ConfigKey.NTLM]);
  });
});
