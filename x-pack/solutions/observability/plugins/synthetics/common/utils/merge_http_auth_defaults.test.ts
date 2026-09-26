/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_HTTP_ADVANCED_FIELDS } from '../constants/monitor_defaults';
import { ConfigKey } from '../runtime_types';
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
});
