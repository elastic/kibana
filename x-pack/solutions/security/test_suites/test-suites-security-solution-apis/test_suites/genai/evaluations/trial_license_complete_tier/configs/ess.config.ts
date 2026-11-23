/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { getSecurityGenAIConfigFromEnvVar } from '../../../../../scripts/genai/vault/manage_secrets';
import { getTinyElserServerArgs } from '../../../knowledge_base/entries/utils/helpers';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(
    require.resolve('../../../../../config/ess/config.base.trial')
  );

  const preconfiguredConnectors = getSecurityGenAIConfigFromEnvVar().connectors;

  return {
    ...functionalConfig.getAll(),
    kbnTestServer: {
      ...functionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...functionalConfig
          .get('kbnTestServer.serverArgs')
          // ssl: false as ML vocab API is broken with SSL enabled
          .filter(
            (a: string) =>
              !(
                a.startsWith('--elasticsearch.hosts=') ||
                a.startsWith('--elasticsearch.ssl.certificateAuthorities=')
              )
          ),
        '--elasticsearch.hosts=http://localhost:9220',
        `--xpack.actions.preconfigured=${JSON.stringify(preconfiguredConnectors)}`,
        `--xpack.actions.allowedHosts=["*"]`,
        `--xpack.securitySolution.enableExperimental=["assistantModelEvaluation"]`,
        ...getTinyElserServerArgs(),
        // Uncomment to enable debug logger to see full eval traces in kibana logs
        // `--logging.loggers=${JSON.stringify([
        //   {
        //     name: 'plugins.elasticAssistant',
        //     level: 'debug',
        //   },
        // ])}`,
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
      esJavaOpts: '-Xms4g -Xmx4g',
    },
    mochaOpts: {
      ...functionalConfig.get('mochaOpts'),
      timeout: 360000 * 2,
    },
  };
}
