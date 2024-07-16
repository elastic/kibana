/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Config, FtrConfigProviderContext } from '@kbn/test';
import { UrlObject } from 'url';
import { ObservabilityAIAssistantFtrConfigName } from '../configs';
import { getApmSynthtraceEsClient } from './create_synthtrace_client';
import { InheritedFtrProviderContext, InheritedServices } from './ftr_provider_context';
import { getScopedApiClient } from './observability_ai_assistant_api_client';
import { editorUser, viewerUser } from './users/users';

export interface ObservabilityAIAssistantFtrConfig {
  name: ObservabilityAIAssistantFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, any>;
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export type CreateTest = ReturnType<typeof createObservabilityAIAssistantAPIConfig>;

export type ObservabilityAIAssistantAPIClient = Awaited<
  ReturnType<CreateTest['services']['observabilityAIAssistantAPIClient']>
>;

export type ObservabilityAIAssistantServices = Awaited<ReturnType<CreateTestConfig>>['services'];

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
}) {
  const services = config.get('services') as InheritedServices;
  const servers = config.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const apmSynthtraceKibanaClient = services.apmSynthtraceKibanaClient();
  const allConfigs = config.getAll() as Record<string, any>;

  return {
    ...allConfigs,
    servers,
    services: {
      ...services,
      apmSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
        getApmSynthtraceEsClient(context, apmSynthtraceKibanaClient),
      observabilityAIAssistantAPIClient: async () => {
        return {
          adminUser: await getScopedApiClient(kibanaServer, 'elastic'),
          viewerUser: await getScopedApiClient(kibanaServer, viewerUser.username),
          editorUser: await getScopedApiClient(kibanaServer, editorUser.username),
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
}

export function createTestConfig(config: ObservabilityAIAssistantFtrConfig) {
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
