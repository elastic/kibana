/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import type { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.js')
  );
  // If TEST_CLOUD environment varible is defined, return the configuration for cloud testing
  if (process.env.TEST_CLOUD !== '1') {
    return {
      ...xpackFunctionalConfig.getAll(),
      pageObjects,
      testFiles: [resolve(__dirname, './pages')],
      junit: {
        reportName: 'X-Pack Cloud Security Posture Functional Tests',
      },
      kbnTestServer: {
        ...xpackFunctionalConfig.get('kbnTestServer'),
        serverArgs: [
          ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
          `--xpack.fleet.packages.0.name=cloud_security_posture`,
          `--xpack.fleet.packages.0.version=1.7.4`,
          // `--xpack.fleet.registryUrl=https://localhost:8080`,
          `--xpack.fleet.agents.fleet_server.hosts=["https://ftr.kibana:8220"]`,
          `--xpack.fleet.internal.fleetServerStandalone=true`,
        ],
      },
    };
  } else {
    // FTR configuration for cloud testing
    return {
      ...xpackFunctionalConfig.getAll(),
      pageObjects,
      testFiles: [resolve(__dirname, './pages')],
      junit: {
        reportName: 'X-Pack Cloud Security Posture Sanity Tests',
      },
    };
  }
}
