/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { ObservabilityAIAssistantFtrConfigName } from '../configs';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import {
  createObservabilityAIAssistantApiClient,
  ObservabilityAIAssistantAPIClient,
} from './observability_ai_assistant_api_client';

export interface ObservabilityAIAssistantFtrConfig {
  name: ObservabilityAIAssistantFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, any>;
}

async function getObservabilityAIAssistantAPIClient({ kibanaServer }: { kibanaServer: UrlObject }) {
  const url = format({
    ...kibanaServer,
  });

  return createObservabilityAIAssistantApiClient(supertest(url));
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export interface CreateTest {
  testFiles: string[];
  servers: any;
  servicesRequiredForTestAnalysis: string[];
  services: InheritedServices & {
    observabilityAIAssistantAPIClient: (context: InheritedFtrProviderContext) => Promise<{
      readUser: ObservabilityAIAssistantAPIClient;
      writeUser: ObservabilityAIAssistantAPIClient;
    }>;
    observabilityAIAssistantFtrConfig: (
      context: InheritedFtrProviderContext
    ) => ObservabilityAIAssistantFtrConfig;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createTestConfig(
  config: ObservabilityAIAssistantFtrConfig
): ({ readConfigFile }: FtrConfigProviderContext) => Promise<CreateTest> {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    const services = xPackAPITestsConfig.get('services') as InheritedServices;
    const servers = xPackAPITestsConfig.get('servers');
    const kibanaServer = servers.kibana as UrlObject;

    const createTest: CreateTest = {
      testFiles: [require.resolve('../tests')],
      servers,
      servicesRequiredForTestAnalysis: ['observabilityAIAssistantFtrConfig', 'registry'],
      services: {
        ...services,
        observabilityAIAssistantFtrConfig: () => config,
        observabilityAIAssistantAPIClient: async (_: InheritedFtrProviderContext) => {
          return {
            readUser: await getObservabilityAIAssistantAPIClient({
              kibanaServer,
            }),
            writeUser: await getObservabilityAIAssistantAPIClient({
              kibanaServer,
            }),
          };
        },
      },
      junit: {
        reportName: `Observability AI Assistant API Integration tests (${name})`,
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

    return createTest;
  };
}

export type ObservabilityAIAssistantServices = Awaited<ReturnType<CreateTestConfig>>['services'];
