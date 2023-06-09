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
import {
  bootstrapApmSynthtrace,
  getApmSynthtraceKibanaClient,
} from '../../../../../../test/apm_api_integration/common/bootstrap_apm_synthtrace';
import { InheritedFtrProviderContext } from '../../../../../apm_api_integration/common/ftr_provider_context';
import { RegistryServerlessProvider } from '../../../../../../test/apm_api_integration/common/registry_serverless';

interface ApmFtrConfig extends CreateTestConfigOptions {
  serverlessProject: 'oblt';
  testFiles: string[];
  kibanaConfig?: Record<string, any>;
  name: string;
  license: 'trial' | 'basic';
}
export function createTestConfig(config: ApmFtrConfig) {
  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const { serverlessProject, testFiles, kibanaConfig, license } = config;
    const svlSharedConfig = await readConfigFile(
      require.resolve('../../../../../shared/config.base.ts')
    );

    const servers = svlSharedConfig.get('servers');
    const kbnTestServer = svlSharedConfig.get('kbnTestServer');
    const esTestCluster = svlSharedConfig.get('esTestCluster');
    const serverArgs = svlSharedConfig.get('kbnTestServer.serverArgs');

    const kibanaServer = servers.kibana as UrlObject;
    const kibanaServerUrl = format(kibanaServer);

    const synthtraceKibanaClient = getApmSynthtraceKibanaClient(kibanaServerUrl);

    return {
      testFiles,
      servers,
      servicesRequiredForTestAnalysis: ['apmFtrConfig', 'registry'],
      services: {
        ...services,
        apmFtrConfig: () => config,
        apmApiClient: async (context: InheritedFtrProviderContext) => {
          return {
            writeUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.elastic,
            }),
          };
        },
        synthtraceEsClient: (context: InheritedFtrProviderContext) => {
          return bootstrapApmSynthtrace(context, synthtraceKibanaClient);
        },
        registry: RegistryServerlessProvider,
        synthtraceKibanaClient: () => synthtraceKibanaClient,
      },
      esTestCluster: {
        ...esTestCluster,
        license,
        // override xpack.security.enabled since it's required for Fleet
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
