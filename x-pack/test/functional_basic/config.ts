/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrConfigProviderContext } from '@kbn/test/types/ftr';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    // default to the xpack functional config
    ...xpackFunctionalConfig.getAll(),
    esTestCluster: {
      ...xpackFunctionalConfig.get('esTestCluster'),
      license: 'basic',
      serverArgs: [
        'xpack.license.self_generated.type=basic',
        'xpack.security.enabled=true',
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    testFiles: [require.resolve('./apps')],
    junit: {
      ...xpackFunctionalConfig.get('junit'),
      reportName: 'Chrome X-Pack UI Functional Tests Basic License',
    },
  };
}
