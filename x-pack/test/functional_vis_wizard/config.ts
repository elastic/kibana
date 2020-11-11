/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackFunctionalConfig = await readConfigFile(require.resolve('../functional/config'));

  return {
    // default to the xpack functional config
    ...xPackFunctionalConfig.getAll(),
    testFiles: [require.resolve('./apps')],
    junit: {
      reportName: 'X-Pack Visualization Wizard Tests with Lens and Maps disabled',
    },
    kbnTestServer: {
      ...xPackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.lens.enabled=false',
        '--xpack.maps.enabled=false',
      ],
    },
  };
}
