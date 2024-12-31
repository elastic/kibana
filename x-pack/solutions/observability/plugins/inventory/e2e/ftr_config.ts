/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { CA_CERT_PATH } from '@kbn/dev-utils';
import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { commonFunctionalUIServices } from '@kbn/ftr-common-functional-ui-services';
import { cypressTestRunner } from './cypress_test_runner';
import { FtrProviderContext } from './ftr_provider_context';

async function ftrConfig({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/common/config')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-xpack/functional/config.base')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    services: {
      ...commonFunctionalServices,
      ...commonFunctionalUIServices,
    },

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
      ],
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        '--home.disableWelcomeScreen=true',
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        // define custom kibana server args here
        `--elasticsearch.ssl.certificateAuthorities=${CA_CERT_PATH}`,
      ],
    },
    testRunner: async (ftrProviderContext: FtrProviderContext) => {
      const result = await cypressTestRunner(ftrProviderContext);

      // set exit code explicitly if at least one Cypress test fails
      if (
        result &&
        ((result as CypressCommandLine.CypressFailedRunResult)?.status === 'failed' ||
          (result as CypressCommandLine.CypressRunResult)?.totalFailed)
      ) {
        process.exitCode = 1;
      }
    },
  };
}

// eslint-disable-next-line import/no-default-export
export default ftrConfig;
