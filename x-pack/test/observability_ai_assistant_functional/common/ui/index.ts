/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import type { ObservabilityAIAssistantRoutes } from '@kbn/observability-ai-assistant-app-plugin/public/routes/config';
import qs from 'query-string';
import type { Role } from '@kbn/security-plugin-types-common';
import { OBSERVABILITY_AI_ASSISTANT_FEATURE_ID } from '@kbn/observability-ai-assistant-plugin/common/feature';
import { APM_SERVER_FEATURE_ID } from '@kbn/apm-plugin/server';
import type { InheritedFtrProviderContext } from '../../ftr_provider_context';

export interface ObservabilityAIAssistantUIService {
  pages: typeof pages;
  auth: {
    login: () => Promise<void>;
    logout: () => Promise<void>;
  };
  router: {
    goto<T extends PathsOf<ObservabilityAIAssistantRoutes>>(
      path: T,
      ...params: TypeAsArgs<TypeOf<ObservabilityAIAssistantRoutes, T>>
    ): Promise<void>;
  };
}

const pages = {
  conversations: {
    setupGenAiConnectorsButtonSelector: `observabilityAiAssistantInitialSetupPanelSetUpGenerativeAiConnectorButton`,
    chatInput: 'observabilityAiAssistantChatPromptEditorTextArea',
    retryButton: 'observabilityAiAssistantWelcomeMessageSetUpKnowledgeBaseButton',
    conversationLink: 'observabilityAiAssistantConversationsLink',
  },
  createConnectorFlyout: {
    flyout: 'create-connector-flyout',
    genAiCard: '.gen-ai-card',
    bedrockCard: '.bedrock-card',
    nameInput: 'nameInput',
    urlInput: 'config.apiUrl-input',
    apiKeyInput: 'secrets.apiKey-input',
    saveButton: 'create-connector-flyout-save-btn',
  },
};

export async function ObservabilityAIAssistantUIProvider({
  getPageObjects,
  getService,
}: InheritedFtrProviderContext): Promise<ObservabilityAIAssistantUIService> {
  const browser = getService('browser');
  const deployment = getService('deployment');
  const security = getService('security');
  const pageObjects = getPageObjects(['common']);

  const roleName = 'observability-ai-assistant-functional-test-role';

  return {
    pages,
    auth: {
      login: async () => {
        await browser.navigateTo(deployment.getHostPort());

        const roleDefinition: Role = {
          name: roleName,
          elasticsearch: {
            cluster: [],
            indices: [],
            run_as: [],
          },
          kibana: [
            {
              spaces: ['*'],
              base: [],
              feature: {
                actions: ['all'],
                [APM_SERVER_FEATURE_ID]: ['all'],
                [OBSERVABILITY_AI_ASSISTANT_FEATURE_ID]: ['all'],
              },
            },
          ],
        };

        await security.role.create(roleName, roleDefinition);

        await security.testUser.setRoles([roleName, 'apm_user']); // performs a page reload
      },
      logout: async () => {
        await security.role.delete(roleName);
        await security.testUser.restoreDefaults();
      },
    },
    router: {
      goto: (...args) => {
        const [path, params] = args;

        const formattedPath = path
          .split('/')
          .map((part) => {
            const match = part.match(/(?:{([a-zA-Z]+)})/);
            return match ? (params.path as Record<string, any>)[match[1]] : part;
          })
          .join('/');

        const urlWithQueryParams = qs.stringifyUrl(
          {
            url: formattedPath,
            query: params.query,
          },
          { encode: true }
        );

        return pageObjects.common.navigateToApp('observabilityAIAssistant', {
          path: urlWithQueryParams.substring(1),
          shouldLoginIfPrompted: true,
          insertTimestamp: false,
        });
      },
    },
  };
}
