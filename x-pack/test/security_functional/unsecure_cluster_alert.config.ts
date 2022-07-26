/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { services } from '../functional/services';
import { pageObjects } from '../functional/page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.base.js')
  );

  const kbnTestServerArgOverrides =  [
    ...kibanaCommonConfig
      .get('kbnTestServer.serverArgs')
      .filter((arg: string) => !arg.startsWith('--security.showInsecureClusterWarning'))
  ];

  kbnTestServerArgOverrides.push('--security.showInsecureClusterWarning=true');

  return {
    testFiles: [resolve(__dirname, './tests/security_check')],

    services,
    pageObjects,

    servers: kibanaFunctionalConfig.get('servers'),

    esTestCluster: {
      license: 'trial',
      from: 'snapshot',
      serverArgs: ['xpack.security.enabled=false'],
    },





    kbnTestServer: {
      ...kibanaCommonConfig.get('kbnTestServer'),
      serverArgs: kbnTestServerArgOverrides,
    },
    uiSettings: {
      defaults: {
        // 'accessibility:disableAnimations': true,
        'dateFormat:tz': 'UTC',
      },
    },
    apps: kibanaFunctionalConfig.get('apps'),
    screenshots: { directory: resolve(__dirname, 'screenshots') },

    junit: {
      reportName: 'Security Check Functional Tests',
    },
  };
}
