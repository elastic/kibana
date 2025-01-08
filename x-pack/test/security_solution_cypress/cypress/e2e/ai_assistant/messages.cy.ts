/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MessageRole } from '@kbn/elastic-assistant-common';
import { TIMELINE_QUERY } from '../../screens/timeline';
import { CASES_URL } from '../../urls/navigation';
import { SEND_TO_TIMELINE_BUTTON } from '../../screens/ai_assistant';
import { openAssistant, selectConversation, sendQueryToTimeline } from '../../tasks/assistant';
import {
  deleteConversations,
  deletePrompts,
  waitForConversation,
} from '../../tasks/api_calls/assistant';
import { createAzureConnector } from '../../tasks/api_calls/connectors';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { login } from '../../tasks/login';
import { visit, visitGetStartedPage } from '../../tasks/navigation';

describe(
  'AI Assistant Messages',
  // TODO - Fix this test to work in serverless - https://github.com/elastic/kibana/pull/190152
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    const mockTimelineQuery = 'host.risk.keyword: "high"';
    const mockConvo = {
      id: 'spooky',
      title: 'Spooky convo',
      messages: [
        {
          timestamp: '2024-08-15T18:30:37.873Z',
          content:
            'You are a helpful, expert assistant who answers questions about Elastic Security. Do not answer questions unrelated to Elastic Security.\nIf you answer a question related to KQL, EQL, or ES|QL, it should be immediately usable within an Elastic Security timeline; please always format the output correctly with back ticks. Any answer provided for Query DSL should also be usable in a security timeline. This means you should only ever include the "filter" portion of the query.\n\nGive a query I can run in the timeline',
          role: 'user' as MessageRole,
        },
        {
          timestamp: '2024-08-15T18:31:24.008Z',
          content:
            'To query events from a high-risk host in the Elastic Security timeline, you can use the following KQL query:\n\n```kql\n' +
            mockTimelineQuery +
            '\n```',
          role: 'assistant' as MessageRole,
          traceData: {
            traceId: '74d2fac29753adebd5c479e3d9e45da3',
            transactionId: 'e13d97d138b8a13c',
          },
        },
      ],
    };
    beforeEach(() => {
      deleteConnectors();
      deleteConversations();
      deletePrompts();
      login();
      createAzureConnector();
      waitForConversation(mockConvo);
    });
    it('A message with a kql query can be used in the timeline only from pages with timeline', () => {
      visitGetStartedPage();
      openAssistant();
      selectConversation(mockConvo.title);
      cy.get(SEND_TO_TIMELINE_BUTTON).should('be.disabled');
      visit(CASES_URL);
      openAssistant();
      sendQueryToTimeline();
      cy.get(TIMELINE_QUERY).should('have.text', `${mockTimelineQuery}`);
    });
  }
);
