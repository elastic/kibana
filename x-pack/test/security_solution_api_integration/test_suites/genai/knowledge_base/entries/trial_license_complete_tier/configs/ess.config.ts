/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../../config/ess/config.base.trial')
  );

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig
          .get('kbnTestServer.serverArgs')
          // ssl: false as ML vocab API is broken with SSL enabled
          .filter(
            (a) =>
              !(
                a.startsWith('--elasticsearch.hosts=') ||
                a.startsWith('--elasticsearch.ssl.certificateAuthorities=')
              )
          ),
        '--elasticsearch.hosts=http://localhost:9220',
        `--xpack.securitySolution.enableExperimental=${JSON.stringify([
          'assistantKnowledgeBaseByDefault',
        ])}`,
      ],
    },
    testFiles: [require.resolve('..')],
    junit: {
      reportName: 'GenAI - Knowledge Base Entries Tests - ESS Env - Trial License',
    },
    // ssl: false as ML vocab API is broken with SSL enabled
    servers: {
      ...functionalConfig.get('servers'),
      elasticsearch: {
        ...functionalConfig.get('servers.elasticsearch'),
        protocol: 'http',
      },
    },
    esTestCluster: {
      ...functionalConfig.get('esTestCluster'),
      ssl: false,
    },
  };
}
