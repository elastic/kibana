/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import type { FtrConfigProviderContext } from '@kbn/test';

import { pageObjects } from '../functional/page_objects';
import { services } from '../functional/services';

// the default export of config files must be a config provider
// that returns an object with the projects config values
export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );

  const testEndpointsPlugin = resolve(__dirname, './plugins/test_endpoints');

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [resolve(__dirname, './tests/expired_session')],
    services,
    pageObjects,
    servers: xpackFunctionalConfig.get('servers'),
    esTestCluster: xpackFunctionalConfig.get('esTestCluster'),
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        `--plugin-path=${testEndpointsPlugin}`,
        '--xpack.security.session.idleTimeout=10s',
        `--xpack.security.authc.providers=${JSON.stringify({
          basic: { basic1: { order: 0 } },
          anonymous: {
            anonymous1: {
              order: 1,
              credentials: { username: 'anonymous_user', password: 'changeme' },
            },
          },
        })}`,
      ],
    },
    uiSettings: xpackFunctionalConfig.get('uiSettings'),
    apps: xpackFunctionalConfig.get('apps'),
    screenshots: { directory: resolve(__dirname, 'screenshots') },
    junit: {
      reportName: 'Chrome X-Pack Security Functional Tests (Expired Session)',
    },
  };
}
