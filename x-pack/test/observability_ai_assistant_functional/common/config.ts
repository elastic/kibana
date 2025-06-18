/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, Config } from '@kbn/test';
import { merge } from 'lodash';
import { UrlObject } from 'url';
import {
  KibanaEBTServerProvider,
  KibanaEBTUIProvider,
} from '@kbn/test-suites-src/analytics/services/kibana_ebt';
import {
  secondaryEditor,
  editor,
  viewer,
  unauthorizedUser,
} from './users/users';
import { getScopedApiClient } from '../../api_integration/deployment_agnostic/apis/observability/ai_assistant/utils/observability_ai_assistant_api_client';
import { InheritedFtrProviderContext, InheritedServices } from '../ftr_provider_context';
import { ObservabilityAIAssistantUIProvider } from './ui';
import { getApmSynthtraceEsClient } from './create_synthtrace_client';
import path from 'path';

export interface ObservabilityAIAssistantFtrConfig {
  name: ObservabilityAIAssistantFtrConfigName;
  license: 'basic' | 'trial';
  kibanaConfig?: Record<string, any>;
}

export const observabilityAIAssistantDebugLogger = {
  name: 'plugins.observabilityAIAssistant',
  level: 'debug',
  appenders: ['console'],
};

export const observabilityAIAssistantFtrConfigs = {
  basic: {
    license: 'basic' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityAIAssistantDebugLogger],
    },
  },
  enterprise: {
    license: 'trial' as const,
    kibanaConfig: {
      'logging.loggers': [observabilityAIAssistantDebugLogger],
      'plugin-path': path.resolve(
        __dirname,
        '../../../../src/platform/test/analytics/plugins/analytics_ftr_helpers'
      ),
    },
  },
};

export type ObservabilityAIAssistantFtrConfigName = keyof typeof observabilityAIAssistantFtrConfigs;

export type ObservabilityAIAssistantServices = Awaited<ReturnType<CreateTestConfig>>['services'];

export type CreateTestConfig = ReturnType<typeof createTestConfig>;
export type TestConfig = Awaited<ReturnType<typeof getTestConfig>>;

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

  const getScopedApiClientForUsername = (username: string) =>
    getScopedApiClient(kibanaServer, username);

  return {
    ...allConfigs,
    servers,
    services: {
      ...services,
      getScopedApiClientForUsername: () => getScopedApiClientForUsername,
      apmSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
        getApmSynthtraceEsClient(context, apmSynthtraceKibanaClient),
      observabilityAIAssistantAPIClient: async () => {
        return {
          admin: getScopedApiClientForUsername('elastic'),
          viewer: getScopedApiClientForUsername(viewer.username),
          editor: getScopedApiClientForUsername(editor.username),
          secondaryEditor: getScopedApiClientForUsername(secondaryEditor.username),
          unauthorizedUser: getScopedApiClientForUsername(unauthorizedUser.username),
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

async function getTestConfig({
  license,
  name,
  kibanaConfig,
  readConfigFile,
}: {
  license: 'basic' | 'trial';
  name: string;
  kibanaConfig: Record<string, any> | undefined;
  readConfigFile: FtrConfigProviderContext['readConfigFile'];
}) {
  const testConfig = await readConfigFile(require.resolve('../../functional/config.base.js'));

  const baseConfig = createObservabilityAIAssistantAPIConfig({
    config: testConfig,
    license,
    name,
    kibanaConfig,
  });

  const kibanaServer = baseConfig.servers.kibana as UrlObject;

  return merge(
    {
      services: testConfig.get('services') as InheritedServices,
    },
    baseConfig,
    {
      testFiles: [require.resolve('../tests')],
      services: {
        observabilityAIAssistantUI: (context: InheritedFtrProviderContext) =>
          ObservabilityAIAssistantUIProvider(context),
        observabilityAIAssistantApi: async () => {
          return {
            admin: getScopedApiClient(kibanaServer, 'elastic'),
            viewer: getScopedApiClient(kibanaServer, viewer.username),
            editor: getScopedApiClient(kibanaServer, editor.username),
            secondaryEditor: getScopedApiClient(kibanaServer, secondaryEditor.username),
          };
        },
        kibana_ebt_server: KibanaEBTServerProvider,
        kibana_ebt_ui: KibanaEBTUIProvider,
      },
    }
  );
}

export function createTestConfig(config: ObservabilityAIAssistantFtrConfig) {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile }: FtrConfigProviderContext) => {
    return getTestConfig({ license, name, kibanaConfig, readConfigFile });
  };
}
