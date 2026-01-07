/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rootRequest } from '../tasks/api_calls/common';

/**
 * Custom Cypress commands for LLM proxy functionality.
 *
 * These commands provide a cleaner API for interacting with the LLM proxy
 * in Cypress tests, wrapping the underlying cy.task() calls.
 *
 * @example
 * // In your test
 * describe('AI Assistant', () => {
 *   let connectorId: string;
 *
 *   before(() => {
 *     cy.startLlmProxy().then((port) => {
 *       cy.createLlmProxyConnector(port).then((id) => {
 *         connectorId = id;
 *       });
 *     });
 *   });
 *
 *   after(() => {
 *     cy.deleteLlmProxyConnector(connectorId);
 *     cy.stopLlmProxy();
 *   });
 *
 *   beforeEach(() => {
 *     cy.clearLlmProxy();
 *   });
 *
 *   it('should respond to user message', () => {
 *     cy.registerLlmResponse('test', 'Hello from the AI!');
 *     // ... interact with AI feature ...
 *     cy.getLlmInterceptedRequests().then((requests) => {
 *       expect(requests).to.have.length(1);
 *     });
 *   });
 * });
 */

/**
 * Start the LLM proxy server.
 * Returns the port number the proxy is listening on.
 */
Cypress.Commands.add('startLlmProxy', () => {
  return cy.task('startLlmProxy');
});

/**
 * Stop the LLM proxy server and clean up resources.
 */
Cypress.Commands.add('stopLlmProxy', () => {
  return cy.task('stopLlmProxy');
});

/**
 * Clear all interceptors and intercepted requests.
 * Call this in beforeEach() to reset state between tests.
 */
Cypress.Commands.add('clearLlmProxy', () => {
  return cy.task('clearLlmProxy');
});

/**
 * Register an interceptor that will respond with the given mock response.
 *
 * @param name - Unique name for this interceptor (for debugging)
 * @param responseMock - The response to return (string or array of strings)
 */
Cypress.Commands.add('registerLlmResponse', (name: string, responseMock: string | string[]) => {
  return cy.task('registerLlmInterceptor', { name, responseMock });
});

/**
 * Register an interceptor with a custom condition based on user message content.
 *
 * @param name - Unique name for this interceptor
 * @param responseMock - The response to return
 * @param matchUserMessage - Only match if the last user message contains this string
 */
Cypress.Commands.add(
  'registerLlmResponseWithCondition',
  (name: string, responseMock: string | string[], matchUserMessage: string) => {
    return cy.task('registerLlmInterceptorWithCondition', { name, responseMock, matchUserMessage });
  }
);

/**
 * Get all intercepted requests for assertions.
 * Returns an array of request objects containing the request body and matching interceptor name.
 */
Cypress.Commands.add('getLlmInterceptedRequests', () => {
  return cy.task('getLlmInterceptedRequests');
});

/**
 * Get the current LLM proxy port, or null if not started.
 */
Cypress.Commands.add('getLlmProxyPort', () => {
  return cy.task('getLlmProxyPort');
});

/**
 * Create a .gen-ai connector that points to the LLM proxy server.
 *
 * @param port - The port the LLM proxy is running on
 * @param name - Optional name for the connector
 * @returns The connector ID
 */
Cypress.Commands.add(
  'createLlmProxyConnector',
  (port: number, name: string = 'LLM Proxy Connector') => {
    return rootRequest<{ id: string }>({
      method: 'POST',
      url: '/api/actions/connector',
      body: {
        name,
        connector_type_id: '.gen-ai',
        config: {
          apiProvider: 'OpenAI',
          apiUrl: `http://localhost:${port}`,
        },
        secrets: {
          apiKey: 'fake-api-key-for-testing',
        },
      },
    }).then((response) => response.body.id);
  }
);

/**
 * Delete a connector by ID.
 *
 * @param connectorId - The ID of the connector to delete
 */
Cypress.Commands.add('deleteLlmProxyConnector', (connectorId: string) => {
  return rootRequest({
    method: 'DELETE',
    url: `/api/actions/connector/${connectorId}`,
    failOnStatusCode: false, // Don't fail if connector already deleted
  });
});
