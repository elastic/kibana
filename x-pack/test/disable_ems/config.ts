/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  return {
    ...kibanaFunctionalConfig.getAll(),
    testFiles: [require.resolve('./tests')],
    services,
    pageObjects,
    junit: {
      reportName: `Kibana Maps without access to Elastic Maps Service`,
    },
    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--map.includeElasticMapsService=false`,
      ],
    },
  };
}
