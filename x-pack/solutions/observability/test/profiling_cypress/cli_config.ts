/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import path from 'path';
import { cypressTestRunner } from './runner';

const kibanaYamlFilePath = path.join(__dirname, './ftr_kibana.yml');

async function ftrConfig({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.ts')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        'xpack.security.enabled=true',
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalTestsConfig
          .get('kbnTestServer.serverArgs')
          .filter((arg: string) => !arg.includes('--xpack.fleet.registryUrl')),
        '--home.disableWelcomeScreen=true',
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
        `--config=${kibanaYamlFilePath}`,
      ],
    },
    testRunner: cypressTestRunner,
  };
}

export default ftrConfig;
