/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { GatlingTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonTestsConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const xpackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.js')
  );

  return {
    ...kibanaCommonTestsConfig.getAll(),

    testRunner: GatlingTestRunner,

    screenshots: {
      directory: resolve(__dirname, 'screenshots'),
    },

    esTestCluster: {
      ...xpackFunctionalTestsConfig.get('esTestCluster'),
      serverArgs: [...xpackFunctionalTestsConfig.get('esTestCluster.serverArgs')],
      esJavaOpts: '-Xms8g -Xmx8g',
    },

    kbnTestServer: {
      ...xpackFunctionalTestsConfig.get('kbnTestServer'),
      sourceArgs: [
        ...xpackFunctionalTestsConfig.get('kbnTestServer.sourceArgs'),
        '--no-base-path',
        '--env.name=development',
      ],
      env: {
        ELASTIC_APM_ACTIVE: process.env.ELASTIC_APM_ACTIVE,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1.0',
        ELASTIC_APM_SERVER_URL: 'https://apm-testing.apm.us-central1.gcp.foundit.no',
        ELASTIC_APM_SECRET_TOKEN: 'bwF17RD4rmj6JcdvKR',
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          simulation: process.env.GATLING_SIMULATIONS
            ? process.env.GATLING_SIMULATIONS
            : 'unknown simulation',
        })
          .filter(([, v]) => !!v)
          .reduce((acc, [k, v]) => (acc ? `${acc},${k}=${v}` : `${k}=${v}`), ''),
      },
      // delay shutdown by 15 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 15_000,
    },
  };
}
