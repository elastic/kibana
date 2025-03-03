/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import { resolve } from 'path';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from '../functional/page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const iframeEmbeddedPlugin = resolve(__dirname, './plugins/iframe_embedded');

  const servers = {
    ...kibanaFunctionalConfig.get('servers'),
    elasticsearch: {
      ...kibanaFunctionalConfig.get('servers.elasticsearch'),
    },
    kibana: {
      ...kibanaFunctionalConfig.get('servers.kibana'),
      protocol: 'https',
      certificateAuthorities: [Fs.readFileSync(CA_CERT_PATH)],
    },
  };

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [require.resolve('./tests')],
    servers,
    services: kibanaFunctionalConfig.get('services'),
    pageObjects,
    browser: {
      acceptInsecureCerts: true,
    },
    junit: {
      reportName: 'Kibana Embedded in iframe with X-Pack Security',
    },

    esTestCluster: kibanaFunctionalConfig.get('esTestCluster'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${iframeEmbeddedPlugin}`,
        '--server.ssl.enabled=true',
        `--server.ssl.key=${KBN_KEY_PATH}`,
        `--server.ssl.certificate=${KBN_CERT_PATH}`,
        `--server.ssl.certificateAuthorities=${CA_CERT_PATH}`,

        '--xpack.security.sameSiteCookies=None',
        '--xpack.security.secureCookies=true',
      ],
    },
  };
}
