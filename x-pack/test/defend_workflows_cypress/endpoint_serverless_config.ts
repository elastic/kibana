/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLocalhostRealIp } from '@kbn/security-solution-plugin/scripts/endpoint/common/localhost_services';
import { FtrConfigProviderContext } from '@kbn/test';

import { ExperimentalFeatures } from '@kbn/security-solution-plugin/common/experimental_features';
import { DefendWorkflowsCypressCliTestRunner } from './runner';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const defendWorkflowsCypressConfig = await readConfigFile(require.resolve('./config.ts'));
  const svlSharedConfig = await readConfigFile(
    require.resolve('../../test_serverless/shared/config.base.ts')
  );

  const hostIp = getLocalhostRealIp();

  const enabledFeatureFlags: Array<keyof ExperimentalFeatures> = [];

  return {
    ...svlSharedConfig.getAll(),
    esTestCluster: {
      ...svlSharedConfig.get('esTestCluster'),
      serverArgs: [
        ...svlSharedConfig.get('esTestCluster.serverArgs'),
        // define custom es server here
        // API Keys is enabled at the top level
      ],
    },
    servers: {
      ...svlSharedConfig.get('servers'),
      fleetserver: {
        protocol: 'https',
        hostname: hostIp,
        port: 8220,
      },
    },
    kbnTestServer: {
      ...svlSharedConfig.get('kbnTestServer'),
      serverArgs: [
        ...svlSharedConfig.get('kbnTestServer.serverArgs'),
        '--csp.strict=false',
        '--csp.warnLegacyBrowsers=false',
        '--serverless=security',
        '--xpack.encryptedSavedObjects.encryptionKey="abcdefghijklmnopqrstuvwxyz123456"',

        '--xpack.security.enabled=true',
        `--xpack.fleet.agents.fleet_server.hosts=["https://${hostIp}:8220"]`,
        `--xpack.fleet.agents.elasticsearch.host=http://${hostIp}:${defendWorkflowsCypressConfig.get(
          'servers.elasticsearch.port'
        )}`,

        // set the packagerTaskInterval to 5s in order to speed up test executions when checking fleet artifacts
        '--xpack.securitySolution.packagerTaskInterval=5s',

        `--xpack.securitySolution.enableExperimental=${JSON.stringify(enabledFeatureFlags)}`,
      ],
    },
    testRunner: DefendWorkflowsCypressCliTestRunner,
  };
}
