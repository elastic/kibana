/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext } from '@kbn/test';
import { merge } from 'lodash';
import { UrlObject } from 'url';
import type { EBTHelpersContract } from '@kbn/analytics-ftr-helpers-plugin/common/types';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import {
  editorUser,
  viewerUser,
} from '../../observability_ai_assistant_api_integration/common/users/users';
import {
  KibanaEBTServerProvider,
  KibanaEBTUIProvider,
} from '../../../../test/analytics/services/kibana_ebt';
import {
  ObservabilityAIAssistantFtrConfig,
  CreateTest as CreateTestAPI,
  createObservabilityAIAssistantAPIConfig,
} from '../../observability_ai_assistant_api_integration/common/config';
import {
  getScopedApiClient,
  ObservabilityAIAssistantAPIClient,
} from '../../observability_ai_assistant_api_integration/common/observability_ai_assistant_api_client';
import { InheritedFtrProviderContext, InheritedServices } from '../ftr_provider_context';
import { ObservabilityAIAssistantUIProvider, ObservabilityAIAssistantUIService } from './ui';

export interface TestConfig extends CreateTestAPI {
  services: Omit<CreateTestAPI['services'], 'observabilityAIAssistantAPIClient'> &
    InheritedServices & {
      observabilityAIAssistantUI: (
        context: InheritedFtrProviderContext
      ) => Promise<ObservabilityAIAssistantUIService>;
      observabilityAIAssistantAPIClient: () => Promise<{
        adminUser: ObservabilityAIAssistantAPIClient;
        viewerUser: ObservabilityAIAssistantAPIClient;
        editorUser: ObservabilityAIAssistantAPIClient;
      }>;
      kibana_ebt_server: (context: InheritedFtrProviderContext) => EBTHelpersContract;
      kibana_ebt_ui: (context: InheritedFtrProviderContext) => EBTHelpersContract;
      apmSynthtraceEsClient: (
        context: InheritedFtrProviderContext
      ) => Promise<ApmSynthtraceEsClient>;
    };
}

export type CreateTestConfig = ReturnType<typeof createTestConfig>;

export function createTestConfig(
  config: ObservabilityAIAssistantFtrConfig
): ({ readConfigFile }: FtrConfigProviderContext) => Promise<TestConfig> {
  const { license, name, kibanaConfig } = config;

  return async ({ readConfigFile, log, esVersion }: FtrConfigProviderContext) => {
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
        services: testConfig.get('services'),
      },
      baseConfig,
      {
        testFiles: [require.resolve('../tests')],
        services: {
          observabilityAIAssistantUI: (context: InheritedFtrProviderContext) =>
            ObservabilityAIAssistantUIProvider(context),
          observabilityAIAssistantAPIClient: async (context: InheritedFtrProviderContext) => {
            return {
              adminUser: await getScopedApiClient(kibanaServer, 'elastic'),
              viewerUser: await getScopedApiClient(kibanaServer, viewerUser.username),
              editorUser: await getScopedApiClient(kibanaServer, editorUser.username),
            };
          },
          kibana_ebt_server: KibanaEBTServerProvider,
          kibana_ebt_ui: KibanaEBTUIProvider,
        },
      }
    );
  };
}
