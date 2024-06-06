/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { FtrConfigProviderContext, findTestPluginPaths } from '@kbn/test';
import { services } from './services';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const integrationConfig = await readConfigFile(require.resolve('../api_integration/config'));

  return {
    testFiles: [require.resolve('./test_suites/task_manager')],
    services,
    servers: integrationConfig.get('servers'),
    esTestCluster: integrationConfig.get('esTestCluster'),
    apps: integrationConfig.get('apps'),
    screenshots: integrationConfig.get('screenshots'),
    junit: {
      reportName: 'Task Manager MGet Claimer Functional Tests',
    },
    kbnTestServer: {
      ...integrationConfig.get('kbnTestServer'),
      serverArgs: [
        ...integrationConfig.get('kbnTestServer.serverArgs'),
        '--xpack.eventLog.logEntries=true',
        '--xpack.eventLog.indexEntries=true',
        '--xpack.task_manager.claim_strategy="unsafe_mget"',
        '--xpack.task_manager.monitored_aggregated_stats_refresh_rate=5000',
        '--xpack.task_manager.ephemeral_tasks.enabled=false',
        '--xpack.task_manager.ephemeral_tasks.request_capacity=100',
        `--xpack.stack_connectors.enableExperimental=${JSON.stringify(['crowdstrikeConnectorOn'])}`,
        ...findTestPluginPaths(path.resolve(__dirname, 'plugins')),
      ],
    },
  };
}
