/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { commonFunctionalServices } from '@kbn/ftr-common-functional-services';
import { FtrConfigProviderContext, EsVersion } from '@kbn/test';
import path from 'node:path';

export default async function ({ readConfigFile, log }: FtrConfigProviderContext) {
  // Read the Kibana API integration tests config file so that we can utilize its services.
  const kibanaAPITestsConfig = await readConfigFile(
    require.resolve('@kbn/test-suites-src/api_integration/config')
  );
  const xPackFunctionalTestsConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const esVersion = EsVersion.getDefault();
  const willRunEsv9 = esVersion.matchRange('9');

  let esTestCluster = {
    ...xPackFunctionalTestsConfig.get('esTestCluster'),
    dataArchive: path.resolve(__dirname, './fixtures/data_archives/upgrade_assistant.zip'),
  };
  if (willRunEsv9) {
    log.info(`Detected ES version ${esVersion}; not loading data archive`);
    esTestCluster = undefined;
  }

  return {
    testFiles: [require.resolve('./upgrade_assistant')],
    servers: xPackFunctionalTestsConfig.get('servers'),
    services: {
      ...commonFunctionalServices,
      supertest: kibanaAPITestsConfig.get('services.supertest'),
    },
    junit: {
      reportName: 'X-Pack Upgrade Assistant Integration Tests',
    },
    kbnTestServer: {
      ...xPackFunctionalTestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalTestsConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${path.resolve(__dirname, '../../../examples/routing_example')}`,
        `--plugin-path=${path.resolve(__dirname, '../../../examples/developer_examples')}`,
      ],
    },
    esTestCluster,
  };
}
