/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ApmUsername,
  APM_TEST_PASSWORD,
} from '@kbn/apm-plugin/server/test_helpers/create_apm_users/authentication';
import { createApmUsers } from '@kbn/apm-plugin/server/test_helpers/create_apm_users/create_apm_users';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { MachineLearningAPIProvider } from '../../functional/services/ml/api';
import { APMFtrConfigName } from '../configs';
import { createApmApiClient } from './apm_api_supertest';
import { bootstrapApmSynthtrace } from './bootstrap_apm_synthtrace';
import {
  FtrProviderContext,
  InheritedFtrProviderContext,
  InheritedServices,
} from './ftr_provider_context';
import { RegistryProvider } from './registry';

export interface ApmFtrConfig {
  name: APMFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, any>;
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

type ApmApiClientKey =
  | 'noAccessUser'
  | 'readUser'
  | 'writeUser'
  | 'annotationWriterUser'
  | 'noMlAccessUser'
  | 'manageOwnAgentKeysUser'
  | 'createAndAllAgentKeysUser'
  | 'monitorClusterAndIndicesUser';

export type ApmApiClient = Record<ApmApiClientKey, Awaited<ReturnType<typeof getApmApiClient>>>;

export interface CreateTest {
  testFiles: string[];
  servers: any;
  servicesRequiredForTestAnalysis: string[];
  services: InheritedServices & {
    apmFtrConfig: () => ApmFtrConfig;
    registry: ({ getService }: FtrProviderContext) => ReturnType<typeof RegistryProvider>;
    synthtraceEsClient: (context: InheritedFtrProviderContext) => Promise<ApmSynthtraceEsClient>;
    apmApiClient: (context: InheritedFtrProviderContext) => ApmApiClient;
    ml: ({ getService }: FtrProviderContext) => ReturnType<typeof MachineLearningAPIProvider>;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createTestConfig(
  config: ApmFtrConfig
): ({ readConfigFile }: FtrConfigProviderContext) => Promise<CreateTest> {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services');
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
            monitorClusterAndIndicesUser: await getApmApiClient({
              kibanaServer,
              username: ApmUsername.apmMonitorClusterAndIndices,
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
