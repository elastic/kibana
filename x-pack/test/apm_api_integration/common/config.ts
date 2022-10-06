/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import {
  ApmUsername,
  APM_TEST_PASSWORD,
} from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import { createApmUsers } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/create_apm_users';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { APMFtrConfigName } from '../configs';
import { createApmApiClient } from './apm_api_supertest';
import { RegistryProvider } from './registry';
import { bootstrapApmSynthtrace } from './bootstrap_apm_synthtrace';
import { MachineLearningAPIProvider } from '../../functional/services/ml/api';

export interface ApmFtrConfig {
  name: APMFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, string | string[]>;
}

async function getApmApiClient({
  kibanaServer,
  username,
}: {
  kibanaServer: UrlObject;
  username: ApmUsername;
}) {
  const url = format({
    ...kibanaServer,
    auth: `${username}:${APM_TEST_PASSWORD}`,
  });

  return createApmApiClient(supertest(url));
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export function createTestConfig(config: ApmFtrConfig) {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services') as InheritedServices;
    const servers = xPackAPITestsConfig.get('servers');
    const kibanaServer = servers.kibana as UrlObject;
    const kibanaServerUrl = format(kibanaServer);
    const esServer = servers.elasticsearch as UrlObject;

    return {
      testFiles: [require.resolve('../tests')],
      servers,
      servicesRequiredForTestAnalysis: ['apmFtrConfig', 'registry'],
      services: {
        ...services,
        apmFtrConfig: () => config,
        registry: RegistryProvider,
        synthtraceEsClient: (context: InheritedFtrProviderContext) => {
          return bootstrapApmSynthtrace(context, kibanaServerUrl);
        },
        apmApiClient: async (context: InheritedFtrProviderContext) => {
          const { username, password } = servers.kibana;
          const esUrl = format(esServer);

          // Creates APM users
          await createApmUsers({
            elasticsearch: { node: esUrl, username, password },
            kibana: { hostname: kibanaServerUrl },
          });

          return {
            noAccessUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.noAccessUser,
            }),
            readUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.viewerUser,
            }),
            writeUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.editorUser,
            }),
            annotationWriterUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmAnnotationsWriteUser,
            }),
            noMlAccessUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmReadUserWithoutMlAccess,
            }),
            manageOwnAgentKeysUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmManageOwnAgentKeys,
            }),
            createAndAllAgentKeysUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmManageOwnAndCreateAgentKeys,
            }),
            monitorIndicesUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmMonitorIndices,
            }),
          };
        },
        ml: MachineLearningAPIProvider,
      },
      junit: {
        reportName: `APM API Integration tests (${name})`,
      },
      esTestCluster: {
        ...xPackAPITestsConfig.get('esTestCluster'),
        license,
      },
      kbnTestServer: {
        ...xPackAPITestsConfig.get('kbnTestServer'),
        serverArgs: [
          ...xPackAPITestsConfig.get('kbnTestServer.serverArgs'),
          ...(kibanaConfig
            ? Object.entries(kibanaConfig).map(([key, value]) =>
                Array.isArray(value) ? `--${key}=${JSON.stringify(value)}` : `--${key}=${value}`
              )
            : []),
        ],
      },
    };
  };
}

export type ApmServices = Awaited<ReturnType<CreateTestConfig>>['services'];
