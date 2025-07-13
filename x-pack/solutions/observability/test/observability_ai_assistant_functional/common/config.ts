/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { UrlObject } from 'url';
import {
  KibanaEBTServerProvider,
  KibanaEBTUIProvider,
} from '@kbn/test-suites-src/analytics/services/kibana_ebt';
import path from 'path';
import { secondaryEditor, editor, viewer } from './users/users';
import { getScopedApiClient } from '../../api_integration_deployment_agnostic/apis/ai_assistant/utils/observability_ai_assistant_api_client';
import { InheritedFtrProviderContext, InheritedServices } from '../ftr_provider_context';
import { ObservabilityAIAssistantUIProvider } from './ui';
import { getApmSynthtraceEsClient } from './create_synthtrace_client';

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

export type CreateTestConfig = ReturnType<typeof createTestConfig>;
export type TestConfig = Awaited<ReturnType<typeof getTestConfig>>;

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
  const testConfig = await readConfigFile(require.resolve('../../functional/config.base.ts'));

  const getScopedApiClientForUsername = (username: string) =>
    getScopedApiClient(kibanaServer, username);
  const servers = testConfig.get('servers');
  const kibanaServer = servers.kibana as UrlObject;
  const services = testConfig.get('services') as InheritedServices;
  const apmSynthtraceKibanaClient = services.apmSynthtraceKibanaClient();
  const allConfigs = testConfig.getAll() as Record<string, any>;

  return {
    ...allConfigs,
    servers,
    testFiles: [require.resolve('../tests')],
    services: {
      ...services,
      getScopedApiClientForUsername: () => getScopedApiClientForUsername,
      kibana_ebt_server: KibanaEBTServerProvider,
      kibana_ebt_ui: KibanaEBTUIProvider,
      apmSynthtraceEsClient: (context: InheritedFtrProviderContext) =>
        getApmSynthtraceEsClient(context, apmSynthtraceKibanaClient),
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
    },
    junit: {
      reportName: `Chrome X-Pack Observability AI Assistant Functional Tests (${name})`,
    },
    esTestCluster: {
      ...testConfig.get('esTestCluster'),
      license,
    },
    kbnTestServer: {
      ...testConfig.get('kbnTestServer'),
      serverArgs: [
        ...testConfig.get('kbnTestServer.serverArgs'),
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
    return getTestConfig({ license, name, kibanaConfig, readConfigFile });
  };
}
