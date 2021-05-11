/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  const kerberosKeytabPath = resolve(__dirname, './fixtures/kerberos/krb5.keytab');
  const kerberosConfigPath = resolve(__dirname, './fixtures/kerberos/krb5.conf');

  return {
    testFiles: [require.resolve('./tests/kerberos')],
    servers: xPackAPITestsConfig.get('servers'),
    services,
    junit: {
      reportName: 'X-Pack Security API Integration Tests (Kerberos)',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.authc.realms.kerberos.kerb1.order=0',
        `xpack.security.authc.realms.kerberos.kerb1.keytab.path=${kerberosKeytabPath}`,
      ],

      // We're going to use the same TGT multiple times and during a short period of time, so we
      // have to disable replay cache so that ES doesn't complain about that.
      esJavaOpts: `-Djava.security.krb5.conf=${kerberosConfigPath} -Dsun.security.krb5.rcache=none`,
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--xpack.security.authc.providers=${JSON.stringify(['kerberos', 'basic'])}`,
      ],
    },
  };
}
