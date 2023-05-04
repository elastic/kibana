/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { createEndpointDockerConfig, getRegistryUrlAsArray } from './registry';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const xPackAPITestsConfig = await readConfigFile(require.resolve('../api_integration/config.ts'));

  return {
    ...xPackAPITestsConfig.getAll(),
    testFiles: [require.resolve('./apis')],
    dockerServers: createEndpointDockerConfig(),
    services,
    junit: {
      reportName: 'X-Pack Endpoint API Integration Tests',
    },
    kbnTestServer: {
      ...xPackAPITestsConfig.get('kbnTestServer'),
      serverArgs: [
        ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
        // if you return an empty string here the kibana server will not start properly but an empty array works
        ...getRegistryUrlAsArray(),
        // always install Endpoint package by default when Fleet sets up
        `--xpack.fleet.packages.0.name=endpoint`,
        `--xpack.fleet.packages.0.version=latest`,
        // this will be removed in 8.7 when the file upload feature is released
        `--xpack.fleet.enableExperimental.0=diagnosticFileUploadEnabled`,
        // this will be removed in 8.7 when the artifacts RBAC is released
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'endpointRbacEnabled',
          'responseActionGetFileEnabled',
          'responseActionExecuteEnabled',
        ])}`,
      ],
    },
  };
}
