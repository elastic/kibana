/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { ApmUsername } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import { getApmApiClient } from '@kbn/apm-plugin/server/test_helpers/apm_api_client/get_apm_api_client';
import { UrlObject, format } from 'url';
import { CreateTestConfigOptions } from '../../../../../shared/types';
import { services } from '../../../../services';
import { bootstrapApmSynthtrace } from '../../../../../../test/apm_api_integration/common/bootstrap_apm_synthtrace';
import { InheritedFtrProviderContext } from '../../../../../apm_api_integration/common/ftr_provider_context';

interface ApmFtrConfig extends CreateTestConfigOptions {
  kibanaConfig?: Record<string, any>;
  name: string;
}
export function createTestConfig(options: ApmFtrConfig) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const { serverlessProject, testFiles, kibanaConfig } = options;
    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../../../shared/config.base.ts')
    );

    const servers = svlSharedConfig.get('servers');
    const kbnTestServer = svlSharedConfig.get('kbnTestServer');
    const esTestCluster = svlSharedConfig.get('esTestCluster');
    const serverArgs = svlSharedConfig.get('kbnTestServer.serverArgs');

    const kibanaServer = servers.kibana as UrlObject;
    const kibanaServerUrl = format(kibanaServer);

    return {
      testFiles,
      servers,
      services: {
        ...services,
        apmApiClient: async (context: InheritedFtrProviderContext) => {
          return {
            writeUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.editorUser,
            }),
          };
        },
        synthtraceEsClient: (context: InheritedFtrProviderContext) => {
          return bootstrapApmSynthtrace(context, kibanaServerUrl);
        },
      },
      esTestCluster: {
        ...esTestCluster,
        serverArgs: [...esTestCluster.serverArgs, 'xpack.security.enabled=true'],
      },
      kbnTestServer: {
        ...kbnTestServer,
        serverArgs: [
          ...serverArgs,
          `--serverless${serverlessProject ? `=${serverlessProject}` : ''}`,
          ...(kibanaConfig
            ? Object.entries(kibanaConfig).map(([key, value]) =>
                Array.isArray(value) ? `--${key}=${JSON.stringify(value)}` : `--${key}=${value}`
              )
            : []),
        ],
      },
      junit: {
        reportName: `APM serverless API Integration tests`,
      },
    };
  };
}
