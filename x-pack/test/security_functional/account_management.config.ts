/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test/types/ftr';
import { services } from '../functional/services';
import { pageObjects } from '../functional/page_objects';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaCommonConfig = await readConfigFile(
    require.resolve('../../../test/common/config.js')
  );
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../../../test/functional/config.js')
  );

  return {
    testFiles: [resolve(__dirname, './tests/account_management')],
    services,
    pageObjects,
    servers: kibanaFunctionalConfig.get('servers'),
    esTestCluster: {
      ...kibanaCommonConfig.get('esTestCluster'),
      license: 'trial',
      serverArgs: [
        ...kibanaCommonConfig.get('esTestCluster.serverArgs'),
        'xpack.security.authc.api_key.enabled=true',
      ],
    },
    kbnTestServer: kibanaCommonConfig.get('kbnTestServer'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
      accountManagement: {
        pathname: '/security/account',
      },
      accountManagementApiKeys: {
        pathname: '/security/account/api-keys',
      },
    },
    esArchiver: { directory: resolve(__dirname, 'es_archives') },
    screenshots: { directory: resolve(__dirname, 'screenshots') },
    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (Account Management)',
    },
  };
}
