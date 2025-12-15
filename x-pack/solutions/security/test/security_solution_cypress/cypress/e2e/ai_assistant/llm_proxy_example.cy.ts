/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { visitGetStartedPage } from '../../tasks/navigation';
import { deleteConnectors } from '../../tasks/api_calls/common';
import { deleteConversations } from '../../tasks/api_calls/assistant';
import {
  openAssistant,
  closeAssistant,
  selectConnector,
  assertConnectorSelected,
  assertMessageSent,
  typeAndSendMessage,
} from '../../tasks/assistant';
import { CONVERSATION_MESSAGE } from '../../screens/ai_assistant';

/**
 * This test file demonstrates how to use the LLM proxy for testing AI features
 * in Security Solution Cypress tests without requiring a real AI connector.
 *
 * The LLM proxy pattern allows you to:
 * 1. Create a local HTTP server that mimics an OpenAI-compatible API
 * 2. Create a real .gen-ai connector that points to the proxy
 * 3. Intercept LLM requests and return predetermined responses
 * 4. Assert on what was sent to the "LLM" (request body inspection)
 *
 * Note: Tests using the LLM proxy should be tagged with '@skipInServerless'
 * since the proxy runs on localhost and won't work in cloud/serverless environments.
 */

const CONNECTOR_NAME = 'LLM Proxy Test Connector';

describe(
  '@ess @skipInServerless LLM Proxy E2E Example',
  { tags: ['@ess', '@skipInServerless'] },
  () => {
    let connectorId: string;

    before(() => {
      // Login to authenticate API requests
      login();

      // Clean up any existing connectors and conversations
      deleteConnectors();
      deleteConversations();

      // Start the LLM proxy server
      cy.startLlmProxy().then((port) => {
        cy.log(`LLM Proxy started on port ${port}`);

        // Create a .gen-ai connector pointing to the proxy
        cy.createLlmProxyConnector(port, CONNECTOR_NAME).then((id) => {
          connectorId = id;
          cy.log(`Created connector with ID: ${id}`);
        });
      });
    });

    after(() => {
      // Clean up: delete connector and stop proxy
      if (connectorId) {
        cy.deleteLlmProxyConnector(connectorId);
      }
      cy.stopLlmProxy();
    });

    beforeEach(() => {
      // Clear interceptors and intercepted requests between tests
      cy.clearLlmProxy();
      // Login before each test
      login();
    });

    describe('Simple Conversation Flow', () => {
      it('should send a message and receive a mocked response from the LLM proxy', () => {
        // 1. Register a mock response that the proxy will return
        const mockResponse = 'Hello! I am a mocked AI response for testing purposes.';
        cy.registerLlmResponse('greeting-response', mockResponse);

        // 2. Navigate to Security and open the AI Assistant
        visitGetStartedPage();
        openAssistant();

        // 3. Select the LLM proxy connector
        selectConnector(CONNECTOR_NAME);
        assertConnectorSelected(CONNECTOR_NAME);

        // 4. Send a message to the assistant
        const userMessage = 'Hello, can you help me?';
        typeAndSendMessage(userMessage);

        // 5. Verify the user message was sent
        assertMessageSent(userMessage);

        // 6. Wait for and verify the mocked response appears
        // The assistant should display the mock response from our proxy
        cy.get(CONVERSATION_MESSAGE, { timeout: 30000 })
          .should('have.length.at.least', 2) // User message + AI response
          .last()
          .should('contain', mockResponse);

        // 7. Verify what was actually sent to the LLM proxy
        cy.getLlmInterceptedRequests().then((requests) => {
          expect(requests).to.have.length.at.least(1);

          const lastRequest = requests[requests.length - 1];
          const { requestBody } = lastRequest;

          // Verify the request structure
          expect(requestBody).to.have.property('messages');
          expect(requestBody.messages).to.be.an('array');

          // Find the user message in the request
          const userMessageInRequest = requestBody.messages.find(
            (msg: { role: string; content: string }) =>
              msg.role === 'user' && msg.content?.includes(userMessage)
          );
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          expect(userMessageInRequest).to.not.be.undefined;

          cy.log('Successfully verified LLM request payload');
        });
      });

      it('should handle streaming responses with multiple chunks', () => {
        // Register a streaming response (array of chunks)
        const streamingChunks = [
          'I am analyzing ',
          'your security ',
          'environment. ',
          'Here are my findings: ',
          'Everything looks secure!',
        ];
        cy.registerLlmResponse('streaming-response', streamingChunks);

        visitGetStartedPage();
        openAssistant();
        selectConnector(CONNECTOR_NAME);

        typeAndSendMessage('Analyze my security posture');

        // The full response should be assembled from all chunks
        const fullResponse = streamingChunks.join('');
        cy.get(CONVERSATION_MESSAGE, { timeout: 30000 })
          .last()
          .should('contain', fullResponse.trim());
      });

      it('should demonstrate conditional responses based on user input', () => {
        // Register different responses for different queries
        cy.registerLlmResponseWithCondition(
          'alerts-query',
          'I found 5 critical alerts that need your attention.',
          'alerts'
        );

        cy.registerLlmResponseWithCondition(
          'rules-query',
          'You have 42 detection rules currently active.',
          'rules'
        );

        visitGetStartedPage();
        openAssistant();
        selectConnector(CONNECTOR_NAME);

        // First query about alerts
        typeAndSendMessage('Show me my alerts');
        cy.get(CONVERSATION_MESSAGE, { timeout: 30000 })
          .last()
          .should('contain', '5 critical alerts');

        // Close and reopen for a fresh conversation
        closeAssistant();

        // Clear for next test
        cy.clearLlmProxy();
        cy.registerLlmResponseWithCondition(
          'rules-query-2',
          'You have 42 detection rules currently active.',
          'rules'
        );

        openAssistant();
        selectConnector(CONNECTOR_NAME);

        // Second query about rules
        typeAndSendMessage('How many rules do I have?');
        cy.get(CONVERSATION_MESSAGE, { timeout: 30000 })
          .last()
          .should('contain', '42 detection rules');
      });
    });

    describe('Request Inspection', () => {
      it('should allow inspection of system prompts and tools sent to the LLM', () => {
        cy.registerLlmResponse('inspection-test', 'Test response for inspection.');

        visitGetStartedPage();
        openAssistant();
        selectConnector(CONNECTOR_NAME);

        typeAndSendMessage('Test message for inspection');

        // Wait for the response
        cy.get(CONVERSATION_MESSAGE, { timeout: 30000 }).last().should('contain', 'Test response');

        // Inspect the request that was sent
        cy.getLlmInterceptedRequests().then((requests) => {
          expect(requests).to.have.length.at.least(1);

          const { requestBody } = requests[requests.length - 1];

          // Log the full request for debugging
          cy.log('Request body:', JSON.stringify(requestBody, null, 2));

          // Verify messages array exists
          expect(requestBody.messages).to.be.an('array');
          expect(requestBody.messages.length).to.be.greaterThan(0);

          // Check for system message (if present)
          const systemMessage = requestBody.messages.find(
            (msg: { role: string }) => msg.role === 'system'
          );
          if (systemMessage) {
            cy.log('System prompt found:', systemMessage.content?.substring(0, 200));
          }

          // Check for tools (if present)
          if (requestBody.tools) {
            const toolNames = requestBody.tools.map(
              (t: { function: { name: string } }) => t.function.name
            );
            cy.log('Available tools:', toolNames.join(', '));
          }

          // Verify the model parameter
          if (requestBody.model) {
            cy.log('Model:', requestBody.model);
          }
        });
      });
    });
  }
);
