/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { FtrConfigProviderContext } from '@kbn/test';
import { GatlingTestRunner } from './runner';

// These "secret" values are intentionally written in the source.
const APM_SERVER_URL = 'https://142fea2d3047486e925eb8b223559cae.apm.europe-west1.gcp.cloud.es.io';
const APM_PUBLIC_TOKEN = 'pWFFEym07AKBBhUE2i';

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
        ELASTIC_APM_CENTRAL_CONFIG: false,
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: '1',
        ELASTIC_APM_BREAKDOWN_METRICS: false,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: false,
        ELASTIC_APM_METRICS_INTERVAL: '120s',
        ELASTIC_APM_MAX_QUEUE_SIZE: 20480,
        ELASTIC_APM_ENVIRONMENT: process.env.CI ? 'ci' : 'development',
        ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
        ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
        ELASTIC_APM_GLOBAL_LABELS: Object.entries({
          simulation: process.env.GATLING_SIMULATIONS
            ? process.env.GATLING_SIMULATIONS
            : 'unknown simulation',
        })
          .filter(([, v]) => !!v)
          .reduce((acc, [k, v]) => (acc ? `${acc},${k}=${v}` : `${k}=${v}`), ''),
      },
      // delay shutdown by 150 seconds to ensure that APM can report the data it collects during test execution
      delayShutdown: 150_000,
    },
  };
}
