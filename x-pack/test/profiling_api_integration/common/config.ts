/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { ProfilingFtrConfigName } from '../configs';
import { createProfilingApiClient } from './api_supertest';
import { createProfilingUsers } from './create_profiling_users';
import {
  PROFILING_TEST_PASSWORD,
  ProfilingUsername,
} from './create_profiling_users/authentication';
import {
  FtrProviderContext,
  InheritedFtrProviderContext,
  InheritedServices,
} from './ftr_provider_context';
import { RegistryProvider } from './registry';

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export async function getProfilingApiClient({
  kibanaServer,
  username,
}: {
  kibanaServer: UrlObject;
  username: ProfilingUsername | 'elastic';
}) {
  const url = format({
    ...kibanaServer,
    auth: `${username}:${PROFILING_TEST_PASSWORD}`,
  });

  return createProfilingApiClient(supertest(url));
}

type ProfilingApiClientKey = 'noAccessUser' | 'readUser' | 'adminUser';

export type ProfilingApiClient = Record<
  ProfilingApiClientKey,
  Awaited<ReturnType<typeof getProfilingApiClient>>
>;

export interface ProfilingFtrConfig {
  name: ProfilingFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, any>;
}

export interface CreateTest {
  testFiles: string[];
  servers: any;
  servicesRequiredForTestAnalysis: string[];
  services: InheritedServices & {
    profilingFtrConfig: () => ProfilingFtrConfig;
    registry: ({ getService }: FtrProviderContext) => ReturnType<typeof RegistryProvider>;
    profilingApiClient: (context: InheritedFtrProviderContext) => ProfilingApiClient;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createTestConfig(
  config: ProfilingFtrConfig
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
      testConfigCategory: ScoutTestRunConfigCategory.API_TEST,
      testFiles: [require.resolve('../tests')],
      servers,
      servicesRequiredForTestAnalysis: ['profilingFtrConfig', 'registry'],
      services: {
        ...services,
        profilingFtrConfig: () => config,
        registry: RegistryProvider,
        profilingApiClient: async (context: InheritedFtrProviderContext) => {
          const security = context.getService('security');
          const securityService = await security.init();

          const { username, password } = servers.kibana;
          const esUrl = format(esServer);

          await createProfilingUsers({
            securityService,
            elasticsearch: { node: esUrl, username, password },
            kibana: { hostname: kibanaServerUrl },
          });

          const adminUser = await getProfilingApiClient({
            kibanaServer,
            username: 'elastic',
          });

          await supertest(kibanaServerUrl).post('/api/fleet/setup').set('kbn-xsrf', 'foo');

          return {
            noAccessUser: await getProfilingApiClient({
              kibanaServer,
              username: ProfilingUsername.noAccessUser,
            }),
            readUser: await getProfilingApiClient({
              kibanaServer,
              username: ProfilingUsername.viewerUser,
            }),
            adminUser,
          };
        },
      },
      junit: {
        reportName: `Profiling API Integration tests (${name})`,
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

export type ProfilingServices = Awaited<ReturnType<CreateTestConfig>>['services'];
