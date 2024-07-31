/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PathsOf, TypeAsArgs, TypeOf } from '@kbn/typed-react-router-config';
import { kbnTestConfig } from '@kbn/test';
import type { ObservabilityAIAssistantRoutes } from '@kbn/observability-ai-assistant-app-plugin/public/routes/config';
import qs from 'query-string';
import { User } from '../../../observability_ai_assistant_api_integration/common/users/users';
import type { InheritedFtrProviderContext } from '../../ftr_provider_context';

export interface ObservabilityAIAssistantUIService {
  pages: typeof pages;
  auth: {
    login: (username: User['username']) => Promise<void>;
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
    positiveFeedbackButton: 'observabilityAiAssistantFeedbackButtonsPositiveButton',
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
  contextualInsights: {
    container: 'obsAiAssistantInsightContainer',
    button: 'obsAiAssistantInsightButton',
    text: 'obsAiAssistantInsightResponse',
  },
};

export async function ObservabilityAIAssistantUIProvider({
  getPageObjects,
  getService,
}: InheritedFtrProviderContext): Promise<ObservabilityAIAssistantUIService> {
  const pageObjects = getPageObjects(['common', 'security']);

  return {
    pages,
    auth: {
      login: async (username: string) => {
        const { password } = kbnTestConfig.getUrlParts();

        await pageObjects.security.login(username, password, {
          expectSpaceSelector: false,
        });
      },
      logout: async () => {
        await pageObjects.security.forceLogout();
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
