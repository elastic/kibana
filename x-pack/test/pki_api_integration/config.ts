/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
// @ts-ignore
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { services } from './services';

export default async function({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.js'));

  const servers = {
    ...xPackAPITestsConfig.get('servers'),
    elasticsearch: {
      ...xPackAPITestsConfig.get('servers.elasticsearch'),
      protocol: 'https',
    },
    kibana: {
      ...xPackAPITestsConfig.get('servers.kibana'),
      protocol: 'https',
    },
  };

  return {
    testFiles: [require.resolve('./apis')],
    servers,
    services,
    junit: {
      reportName: 'X-Pack PKI API Integration Tests',
    },

    esTestCluster: {
      ...xPackAPITestsConfig.get('esTestCluster'),
      ssl: true,
      serverArgs: [
        ...xPackAPITestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.authc.token.timeout=15s',
        'xpack.security.http.ssl.client_authentication=optional',
        'xpack.security.http.ssl.verification_mode=certificate',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.pki.pki1.order=1',
        'xpack.security.authc.realms.pki.pki1.delegation.enabled=true',
        `xpack.security.authc.realms.pki.pki1.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },

    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${JSON.stringify([
          CA_CERT_PATH,
          resolve(__dirname, './fixtures/kibana_ca.crt'),
        ])}`,
        `--server.ssl.clientAuthentication=required`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--xpack.security.authc.providers=${JSON.stringify(['pki', 'basic'])}`,
      ],
    },
  };
}
