/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Config, FtrConfigProviderContext } from '@kbn/test';
import supertest from 'supertest';
import { format, UrlObject } from 'url';
import { ObservabilityAIAssistantFtrConfigName } from '../configs';
import { InheritedServices } from './ftr_provider_context';
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
  services: InheritedServices & {
    observabilityAIAssistantAPIClient: () => Promise<{
      readUser: ObservabilityAIAssistantAPIClient;
      writeUser: ObservabilityAIAssistantAPIClient;
    }>;
  };
  junit: { reportName: string };
  esTestCluster: any;
  kbnTestServer: any;
}

export function createObservabilityAIAssistantAPIConfig({
  config,
  license,
  name,
  kibanaConfig,
}: {
  config: Config;
  license: 'basic' | 'trial';
  name: string;
  kibanaConfig?: Record<string, any>;
}): Omit<CreateTest, 'testFiles'> {
  const services = config.get('services') as InheritedServices;
  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;

  const createTest: Omit<CreateTest, 'testFiles'> = {
    ...config.getAll(),
    servers,
    services: {
      ...services,
      observabilityAIAssistantAPIClient: async () => {
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
      ...config.get('esTestCluster'),
      license,
    },
    kbnTestServer: {
      ...config.get('kbnTestServer'),
      serverArgs: [
        ...config.get('kbnTestServer.serverArgs'),
        ...(kibanaConfig
          ? Object.entries(kibanaConfig).map(([key, value]) =>
              Array.isArray(value) ? `--${key}=${JSON.stringify(value)}` : `--${key}=${value}`
            )
          : []),
      ],
    },
  };

  return createTest;
}

export function createTestConfig(
  config: ObservabilityAIAssistantFtrConfig
): ({ readConfigFile }: FtrConfigProviderContext) => Promise<CreateTest> {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    const xPackAPITestsConfig = await readConfigFile(
      require.resolve('../../api_integration/config.ts')
    );

    return {
      ...createObservabilityAIAssistantAPIConfig({
        config: xPackAPITestsConfig,
        name,
        license,
        kibanaConfig,
      }),
      testFiles: [require.resolve('../tests')],
    };
  };
}

export type ObservabilityAIAssistantServices = Awaited<ReturnType<CreateTestConfig>>['services'];
