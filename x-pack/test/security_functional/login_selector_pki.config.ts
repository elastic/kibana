/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import Fs from 'fs';
import { services } from '../functional/services';
import { pageObjects } from '../functional/page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.js')
  );

  const servers = {
    ...kibanaFunctionalConfig.get('servers'),
    elasticsearch: { ...kibanaFunctionalConfig.get('servers.elasticsearch'), protocol: 'https' },
    kibana: {
      ...kibanaFunctionalConfig.get('servers.kibana'),
      protocol: 'https',
      ssl: {
        enabled: true,
        key: Fs.readFileSync(KBN_KEY_PATH).toString('utf8'),
        certificate: Fs.readFileSync(KBN_CERT_PATH).toString('utf8'),
        certificateAuthorities: Fs.readFileSync(CA_CERT_PATH).toString('utf8'),
      },
    },
  };

  return {
    testFiles: [resolve(__dirname, './tests/login_selector_pki')],

    services,
    pageObjects,
    browser: {
      acceptInsecureCerts: true,
    },
    servers,

    esTestCluster: {
      ...kibanaFunctionalConfig.get('esTestCluster'),
      license: 'trial',
      from: 'snapshot',
      ssl: true,
      serverArgs: [
        ...kibanaFunctionalConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.token.enabled=true',
        'xpack.security.http.ssl.client_authentication=optional',
        'xpack.security.http.ssl.verification_mode=certificate',
        'xpack.security.authc.realms.native.native1.order=0',
        'xpack.security.authc.realms.pki.pki1.order=1',
        'xpack.security.authc.realms.pki.pki1.delegation.enabled=true',
        `xpack.security.authc.realms.pki.pki1.certificate_authorities=${CA_CERT_PATH}`,
      ],
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaCommonConfig.get('kbnTestServer.serverArgs'),
        '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--server.ssl.clientAuthentication=optional`,
        `--elasticsearch.hosts=${servers.elasticsearch.protocol}://${servers.elasticsearch.hostname}:${servers.elasticsearch.port}`,
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          pki: { pki1: { order: 1 } },
        })}`,
      ],
    },
    uiSettings: {
      defaults: {
        'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    apps: kibanaFunctionalConfig.get('apps'),
    esArchiver: { directory: resolve(__dirname, 'es_archives') },
    screenshots: { directory: resolve(__dirname, 'screenshots') },

    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (Login Selector with PKI)',
    },
  };
}
