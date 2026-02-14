/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-security/ui';
import { test, tags } from '../fixtures';
import {
  createAzureConnector,
  createConversation,
  deleteConnectors,
  deleteConversations,
  deletePrompts,
} from '../common/api_helpers';
import { waitForPageReady } from '../common/constants';

const mockTimelineQuery = 'host.risk.keyword: "high"';

const mockConvo = {
  id: 'spooky',
  title: 'Spooky convo',
  messages: [
    {
      timestamp: '2024-08-15T18:30:37.873Z',
      content:
        'You are a helpful, expert assistant who answers questions about Elastic Security.\n\nGive a query I can run in the timeline',
      role: 'user',
    },
    {
      timestamp: '2024-08-15T18:31:24.008Z',
      content: `To query events from a high-risk host in the Elastic Security timeline, you can use the following KQL query:\n\n\`\`\`kql\n${mockTimelineQuery}\n\`\`\``,
      role: 'assistant',
      traceData: {
        traceId: '74d2fac29753adebd5c479e3d9e45da3',
        transactionId: 'e13d97d138b8a13c',
      },
    },
  ],
};

test.describe(
  'AI Assistant Messages',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    test.beforeEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deletePrompts(esClient);
      await createAzureConnector(kbnClient);
      await createConversation(kbnClient, mockConvo);
    });

    test.afterEach(async ({ kbnClient, esClient }) => {
      await deleteConnectors(kbnClient);
      await deleteConversations(esClient);
      await deletePrompts(esClient);
    });

    test('A message with a kql query can be used in the timeline only from pages with timeline', async ({
      browserAuth,
      page,
      pageObjects,
      kbnUrl,
    }) => {
      test.setTimeout(180_000);
      await browserAuth.loginAsAdmin();

      await test.step('from get_started page, Send to Timeline should be disabled', async () => {
        await page.goto(kbnUrl.get('/app/security/get_started'));
        await waitForPageReady(page);
        await pageObjects.assistant.openAssistant();
        await pageObjects.assistant.selectConversation(mockConvo.title);
        await expect(pageObjects.assistant.sendToTimelineButton).toBeDisabled();
      });

      await test.step('from cases page (has timeline), Send to Timeline should work', async () => {
        await page.goto(kbnUrl.get('/app/security/cases'));
        await waitForPageReady(page);
        await pageObjects.assistant.openAssistant();
        await pageObjects.assistant.sendQueryToTimeline();

        await expect(page.testSubj.locator('timelineQueryInput')).toHaveText(mockTimelineQuery);
      });
    });
  }
);
