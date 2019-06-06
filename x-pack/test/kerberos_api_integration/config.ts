/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { KibanaFunctionalTestDefaultProviders } from '../types/providers';

// eslint-disable-next-line import/no-default-export
export default async function({ readConfigFile }: KibanaFunctionalTestDefaultProviders) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  const kerberosKeytabPath = resolve(
    __dirname,
    '../../test/kerberos_api_integration/fixtures/krb5.keytab'
  );
  const kerberosConfigPath = resolve(
    __dirname,
    '../../test/kerberos_api_integration/fixtures/krb5.conf'
  );

  return {
    testFiles: [require.resolve('./apis')],
    servers: xPackAPITestsConfig.get('servers'),
    services: {
      es: xPackAPITestsConfig.get('services.es'),
      esSupertest: xPackAPITestsConfig.get('services.esSupertest'),
      supertestWithoutAuth: xPackAPITestsConfig.get('services.supertestWithoutAuth'),
    },
    junit: {
      reportName: 'X-Pack Kerberos API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        `xpack.security.authc.realms.kerberos.kerb1.keytab.path=${kerberosKeytabPath}`,
      ],
      serverEnvVars: {
        // We're going to use the same TGT multiple times and during a short period of time, so we
        // have to disable replay cache so that ES doesn't complain about that.
        ES_JAVA_OPTS: `-Djava.security.krb5.conf=${kerberosConfigPath} -Dsun.security.krb5.rcache=none`,
      },
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        `--xpack.security.authProviders=${JSON.stringify(['kerberos', 'basic'])}`,
      ],
    },
  };
}
