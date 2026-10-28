/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIChatExperience } from '@kbn/ai-assistant-common';
import type { ConversationCreateProps } from '@kbn/elastic-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { expect } from '@kbn/scout-security/ui';
import {
  createConversation,
  deleteConversation,
  deleteConversationsByTitle,
  getPlatformEngineerCookieHeader,
  spaceTest,
  tags,
} from '../fixtures';

const KQL_QUERY = 'host.risk.keyword: "high"';
const CONVERSATION_TITLE = 'Spooky convo';

const buildConversation = (connectorId: string): ConversationCreateProps => ({
  title: CONVERSATION_TITLE,
  apiConfig: {
    actionTypeId: '.gen-ai',
    connectorId,
    defaultSystemPromptId: 'default-system-prompt',
    model: 'test-model',
    provider: 'OpenAI',
  },
  excludeFromLastConversationStorage: false,
  replacements: {},
  category: 'assistant',
  messages: [
    {
      timestamp: '2024-08-15T18:30:37.873Z',
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\n\nGive a query I can run in the timeline',
      role: 'user',
    },
    {
      timestamp: '2024-08-15T18:31:24.008Z',
      content: `To query events from a high-risk host in the Elastic Security timeline, you can use the following KQL query:\n\n\`\`\`kql\n${KQL_QUERY}\n\`\`\``,
      role: 'assistant',
      traceData: {
        traceId: '74d2fac29753adebd5c479e3d9e45da3',
        transactionId: 'e13d97d138b8a13c',
      },
    },
  ],
});

spaceTest.describe(
  'AI Assistant - send a KQL query from a message to Timeline',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    let cookieHeader: Record<string, string>;
    let connectorId: string | undefined;
    let conversationId: string | undefined;

    spaceTest.beforeAll(
      async ({ apiClient, apiServices, config, roleDescriptors, samlAuth, scoutSpace }) => {
        await scoutSpace.uiSettings.set({ [AI_CHAT_EXPERIENCE_TYPE]: AIChatExperience.Classic });

        const connector = await apiServices.alerting.connectors.create(
          {
            name: `Azure OpenAI scout connector ${scoutSpace.id}`,
            connectorTypeId: '.gen-ai',
            config: {
              apiUrl:
                'https://goodurl.com/openai/deployments/good-gpt4o/chat/completions?api-version=2024-02-15-preview',
              apiProvider: 'Azure OpenAI',
            },
            secrets: { apiKey: '123' },
          },
          scoutSpace.id
        );
        connectorId = connector.id;

        cookieHeader = await getPlatformEngineerCookieHeader({
          samlAuth,
          config,
          roleDescriptors,
        });
        // Conversations are not saved objects: they outlive the worker space, so drop leftovers of an interrupted run.
        await deleteConversationsByTitle({
          apiClient,
          cookieHeader,
          spaceId: scoutSpace.id,
          title: CONVERSATION_TITLE,
        });
        const conversation = await createConversation({
          apiClient,
          cookieHeader,
          spaceId: scoutSpace.id,
          conversation: buildConversation(connector.id),
        });
        conversationId = conversation.id;
      }
    );

    spaceTest.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPlatformEngineer();
    });

    spaceTest.afterAll(async ({ apiClient, apiServices, scoutSpace }) => {
      if (conversationId) {
        await deleteConversation({
          apiClient,
          cookieHeader,
          spaceId: scoutSpace.id,
          id: conversationId,
        });
      }
      if (connectorId) {
        await apiServices.alerting.connectors.delete(connectorId, scoutSpace.id);
      }
      await scoutSpace.uiSettings.unset(AI_CHAT_EXPERIENCE_TYPE);
    });

    spaceTest(
      'a KQL query in a message can be sent to Timeline only from pages that show Timeline',
      async ({ pageObjects }) => {
        const { aiAssistantPage, timelinePage } = pageObjects;

        await spaceTest.step('Send to Timeline is disabled on Get started', async () => {
          await aiAssistantPage.gotoGetStarted();
          await aiAssistantPage.open();
          await aiAssistantPage.selectConversation(CONVERSATION_TITLE);
          await expect(aiAssistantPage.sendToTimelineButton).toBeDisabled();
        });

        await spaceTest.step(
          'Send to Timeline opens Timeline with the query on Cases',
          async () => {
            await aiAssistantPage.gotoCases();
            await aiAssistantPage.open();
            await expect(aiAssistantPage.conversationTitle).toContainText(CONVERSATION_TITLE);
            await aiAssistantPage.sendToTimeline();
            await expect(timelinePage.queryInput).toHaveText(KQL_QUERY);
          }
        );
      }
    );
  }
);
