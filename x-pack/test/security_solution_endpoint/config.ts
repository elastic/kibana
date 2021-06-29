/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resolve } from 'path';
import { FtrConfigProviderContext } from '@kbn/test';
import { pageObjects } from './page_objects';
import { services } from './services';
import {
  getRegistryUrlAsArray,
  createEndpointDockerConfig,
} from '../security_solution_endpoint_api_int/registry';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xpackFunctionalConfig = await readConfigFile(require.resolve('../functional/config.js'));

  return {
    ...xpackFunctionalConfig.getAll(),
    pageObjects,
    testFiles: [resolve(__dirname, './apps/endpoint')],
    dockerServers: createEndpointDockerConfig(),
    junit: {
      reportName: 'X-Pack Endpoint Functional Tests',
    },
    services,
    apps: {
      ...xpackFunctionalConfig.get('apps'),
      ['securitySolutionManagement']: {
        pathname: '/app/security/administration',
      },
      ['security']: {
        pathname: '/app/security',
      },
    },
    kbnTestServer: {
      ...xpackFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...xpackFunctionalConfig.get('kbnTestServer.serverArgs'),
        // if you return an empty string here the kibana server will not start properly but an empty array works
        ...getRegistryUrlAsArray(),
        // always install Endpoint package by default when Fleet sets up
        `--xpack.fleet.packages.0.name=endpoint`,
        `--xpack.fleet.packages.0.version=latest`,
      ],
    },
    layout: {
      fixedHeaderHeight: 200,
    },
  };
}
