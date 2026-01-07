/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Interface for intercepted LLM request data returned by getLlmInterceptedRequests
 */
interface LlmInterceptedRequest {
  requestBody: {
    messages: Array<{
      role: string;
      content: string | null;
      tool_calls?: Array<{
        function: {
          name: string;
          arguments: string;
        };
        id: string;
        type: string;
      }>;
    }>;
    tools?: Array<{
      function: {
        name: string;
        description: string;
        parameters: unknown;
      };
    }>;
    tool_choice?: unknown;
    model?: string;
    stream?: boolean;
  };
  matchingInterceptorName: string | undefined;
}

declare namespace Cypress {
  interface Chainable<Subject> {
    promisify(): Promise<Subject>;
    attachFile(fileName: string, fileType?: string): Chainable<JQuery>;
    waitUntil(
      fn: (subject: Subject) => boolean | Chainable<boolean>,
      options?: {
        interval: number;
        timeout: number;
      }
    ): Chainable<Subject>;
    /**
     * Sets a new non-default space id as current
     */
    setCurrentSpace(spaceId: string): void;
    /**
     * Reads current space id value. `undefined` is returned for default space.
     */
    currentSpace(): Chainable<string>;

    getByTestSubjContains(
      ...args: Parameters<Cypress.Chainable['get']>
    ): Chainable<JQuery<HTMLElement>>;

    // ==========================================
    // LLM Proxy Commands
    // ==========================================

    /**
     * Start the LLM proxy server.
     * Returns the port number the proxy is listening on.
     *
     * @example
     * cy.startLlmProxy().then((port) => {
     *   cy.createLlmProxyConnector(port);
     * });
     */
    startLlmProxy(): Chainable<number>;

    /**
     * Stop the LLM proxy server and clean up resources.
     */
    stopLlmProxy(): Chainable<null>;

    /**
     * Clear all interceptors and intercepted requests.
     * Call this in beforeEach() to reset state between tests.
     */
    clearLlmProxy(): Chainable<null>;

    /**
     * Register an interceptor that will respond with the given mock response.
     *
     * @param name - Unique name for this interceptor (for debugging)
     * @param responseMock - The response to return (string or array of strings for streaming)
     *
     * @example
     * cy.registerLlmResponse('greeting', 'Hello! How can I help you?');
     */
    registerLlmResponse(name: string, responseMock: string | string[]): Chainable<null>;

    /**
     * Register an interceptor with a custom condition based on user message content.
     *
     * @param name - Unique name for this interceptor
     * @param responseMock - The response to return
     * @param matchUserMessage - Only match if the last user message contains this string
     *
     * @example
     * cy.registerLlmResponseWithCondition('alerts-query', 'Found 5 alerts', 'show me alerts');
     */
    registerLlmResponseWithCondition(
      name: string,
      responseMock: string | string[],
      matchUserMessage: string
    ): Chainable<null>;

    /**
     * Get all intercepted requests for assertions.
     * Returns an array of request objects containing the request body and matching interceptor name.
     *
     * @example
     * cy.getLlmInterceptedRequests().then((requests) => {
     *   expect(requests).to.have.length(1);
     *   expect(requests[0].requestBody.messages[0].role).to.equal('system');
     * });
     */
    getLlmInterceptedRequests(): Chainable<LlmInterceptedRequest[]>;

    /**
     * Get the current LLM proxy port, or null if not started.
     */
    getLlmProxyPort(): Chainable<number | null>;

    /**
     * Create a .gen-ai connector that points to the LLM proxy server.
     *
     * @param port - The port the LLM proxy is running on
     * @param name - Optional name for the connector (defaults to 'LLM Proxy Connector')
     * @returns The connector ID
     *
     * @example
     * cy.startLlmProxy().then((port) => {
     *   cy.createLlmProxyConnector(port).then((connectorId) => {
     *     // Use connectorId in your tests
     *   });
     * });
     */
    createLlmProxyConnector(port: number, name?: string): Chainable<string>;

    /**
     * Delete a connector by ID.
     *
     * @param connectorId - The ID of the connector to delete
     */
    deleteLlmProxyConnector(connectorId: string): Chainable<Cypress.Response<unknown>>;
  }
}

declare namespace Mocha {
  interface SuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite;
  }

  interface ExclusiveSuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite;
  }

  interface PendingSuiteFunction {
    (title: string, ftrConfig: Record<string, string | number>, fn: (this: Suite) => void): Suite;
    (
      title: string,
      ftrConfig?: Record<string, string | number>,
      config: Cypress.TestConfigOverrides,
      fn: (this: Suite) => void
    ): Suite | void;
  }
}
