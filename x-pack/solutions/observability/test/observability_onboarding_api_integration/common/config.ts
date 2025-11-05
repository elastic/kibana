/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ObservabilityOnboardingUsername,
  OBSERVABILITY_ONBOARDING_TEST_PASSWORD,
} from '@kbn/observability-onboarding-plugin/server/test_helpers/create_observability_onboarding_users/authentication';
import { createObservabilityOnboardingUsers } from '@kbn/observability-onboarding-plugin/server/test_helpers/create_observability_onboarding_users';
import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { ObservabilityOnboardingFtrConfigName } from '../configs';
import {
  FtrProviderContext,
  InheritedFtrProviderContext,
  InheritedServices,
} from './ftr_provider_context';
import { createObservabilityOnboardingApiClient } from './observability_onboarding_api_supertest';
import { RegistryProvider } from './registry';

export interface ObservabilityOnboardingFtrConfig {
  name: ObservabilityOnboardingFtrConfigName;
  license: 'basic';
  kibanaConfig?: Record<string, any>;
}

async function getObservabilityOnboardingApiClient({
  kibanaServer,
  username,
}: {
  kibanaServer: UrlObject;
  username: ObservabilityOnboardingUsername | 'elastic';
}) {
  const url = format({
    ...kibanaServer,
    auth: `${username}:${OBSERVABILITY_ONBOARDING_TEST_PASSWORD}`,
  });

  return createObservabilityOnboardingApiClient(supertest(url));
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export type ObservabilityOnboardingApiClientKey =
  | 'noAccessUser'
  | 'readUser'
  | 'adminUser'
  | 'writeUser'
  | 'logMonitoringUser';

export type ObservabilityOnboardingApiClient = Record<
  ObservabilityOnboardingApiClientKey,
  Awaited<ReturnType<typeof getObservabilityOnboardingApiClient>>
>;

export interface CreateTest {
  testFiles: string[];
  servers: any;
  servicesRequiredForTestAnalysis: string[];
  services: InheritedServices & {
    observabilityOnboardingFtrConfig: () => ObservabilityOnboardingFtrConfig;
    registry: ({ getService }: FtrProviderContext) => ReturnType<typeof RegistryProvider>;
    logSynthtraceEsClient: (
      context: InheritedFtrProviderContext
    ) => Promise<LogsSynthtraceEsClient>;
    observabilityOnboardingApiClient: (
      context: InheritedFtrProviderContext
    ) => ObservabilityOnboardingApiClient;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createTestConfig(
  config: ObservabilityOnboardingFtrConfig
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
      servicesRequiredForTestAnalysis: ['observabilityOnboardingFtrConfig', 'registry'],
      services: {
        ...services,
        observabilityOnboardingFtrConfig: () => config,
        registry: RegistryProvider,
        logSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
          new LogsSynthtraceEsClient({
            client: context.getService('es'),
            logger: createLogger(LogLevel.info),
            refreshAfterIndex: true,
          }),
        observabilityOnboardingApiClient: async (_: InheritedFtrProviderContext) => {
          const { username, password } = servers.kibana;
          const esUrl = format(esServer);

          // Creates ObservabilityOnboarding users
          await createObservabilityOnboardingUsers({
            elasticsearch: { node: esUrl, username, password },
            kibana: { hostname: kibanaServerUrl },
          });

          return {
            noAccessUser: await getObservabilityOnboardingApiClient({
              kibanaServer,
              username: ObservabilityOnboardingUsername.noAccessUser,
            }),
            readUser: await getObservabilityOnboardingApiClient({
              kibanaServer,
              username: ObservabilityOnboardingUsername.viewerUser,
            }),
            adminUser: await getObservabilityOnboardingApiClient({
              kibanaServer,
              username: 'elastic',
            }),
            writeUser: await getObservabilityOnboardingApiClient({
              kibanaServer,
              username: ObservabilityOnboardingUsername.editorUser,
            }),
            logMonitoringUser: await getObservabilityOnboardingApiClient({
              kibanaServer,
              username: ObservabilityOnboardingUsername.logMonitoringUser,
            }),
          };
        },
      },
      junit: {
        reportName: `Observability onboarding API Integration tests (${name})`,
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

export type ObservabilityOnboardingServices = Awaited<ReturnType<CreateTestConfig>>['services'];
