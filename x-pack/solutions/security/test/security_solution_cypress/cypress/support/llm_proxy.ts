/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLlmProxy, type LlmProxy } from '@kbn/llm-proxy-test-helper';
import type { ToolingLog } from '@kbn/tooling-log';

// Singleton proxy instance - persists across test files
let proxy: LlmProxy | null = null;

// Clean up proxy on process exit to prevent dangling interceptors
const cleanup = () => {
  if (proxy) {
    try {
      proxy.clear();
      proxy.close();
    } catch {
      // Ignore errors during cleanup
    }
    proxy = null;
  }
};

process.on('exit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

/**
 * Creates a simple log adapter for Cypress that implements the ToolingLog interface
 * required by the LLM proxy.
 */
function createLogAdapter(): ToolingLog {
  return {
    // eslint-disable-next-line no-console
    info: (msg: string) => console.log(`[LLM Proxy INFO] ${msg}`),
    // eslint-disable-next-line no-console
    debug: (msg: string) => console.log(`[LLM Proxy DEBUG] ${msg}`),
    // eslint-disable-next-line no-console
    warning: (msg: string) => console.warn(`[LLM Proxy WARN] ${msg}`),
    // eslint-disable-next-line no-console
    error: (msg: string) => console.error(`[LLM Proxy ERROR] ${msg}`),
    verbose: () => {},
    success: () => {},
    write: () => {},
    indent: () => createLogAdapter(),
    getWritten: () => ({ json: false, log: '', error: '' }),
    getWriters: () => ({ log: process.stdout, error: process.stderr }),
  } as unknown as ToolingLog;
}

/**
 * Cypress plugin that enables LLM proxy functionality via cy.task().
 *
 * This allows Cypress tests to:
 * - Start/stop a local HTTP server that mimics an OpenAI-compatible API
 * - Register interceptors to return predetermined responses
 * - Inspect what was sent to the "LLM" for assertions
 *
 * @example
 * // In cypress.config.ts
 * import { llmProxyPlugin } from './support/llm_proxy';
 *
 * export default defineCypressConfig({
 *   e2e: {
 *     setupNodeEvents(on, config) {
 *       llmProxyPlugin(on, config);
 *     },
 *   },
 * });
 */
export const llmProxyPlugin = (
  on: Cypress.PluginEvents,
  _config: Cypress.PluginConfigOptions
): void => {
  on('task', {
    /**
     * Start the LLM proxy server.
     * Returns the port number the proxy is listening on.
     *
     * @example
     * cy.task('startLlmProxy').then((port) => {
     *   // Create connector pointing to http://localhost:${port}
     * });
     */
    startLlmProxy: async (): Promise<number> => {
      const log = createLogAdapter();

      // If proxy exists, clean it up first to avoid stale interceptors
      if (proxy) {
        log.info('Cleaning up existing proxy before starting new one');
        try {
          proxy.clear(); // Clear any pending interceptors
          proxy.close();
        } catch (e) {
          log.warning(`Error cleaning up existing proxy: ${e}`);
        }
        proxy = null;
      }

      proxy = await createLlmProxy(log);
      log.info(`Started on port ${proxy.getPort()}`);
      return proxy.getPort();
    },

    /**
     * Stop the LLM proxy server and clean up.
     */
    stopLlmProxy: (): null => {
      if (proxy) {
        proxy.close();
        proxy = null;
      }
      return null;
    },

    /**
     * Register an interceptor that will respond with the given mock response.
     * Uses fire-and-forget pattern - doesn't wait for the intercept to complete.
     *
     * @param options.name - Unique name for this interceptor (for debugging)
     * @param options.responseMock - The response to return (string or array of strings for streaming)
     *
     * @example
     * cy.task('registerLlmInterceptor', {
     *   name: 'test-response',
     *   responseMock: 'This is a mocked LLM response',
     * });
     */
    registerLlmInterceptor: ({
      name,
      responseMock,
    }: {
      name: string;
      responseMock: string | string[];
    }): null => {
      if (!proxy) {
        throw new Error('LLM Proxy not started. Call cy.task("startLlmProxy") first.');
      }

      // Use completeAfterIntercept but don't await it - the response will be sent
      // when a matching request comes in. We catch any errors to prevent crashes
      // if the test ends before the interceptor is triggered.
      proxy
        .intercept({
          name,
          when: () => true, // Match all requests
          responseMock,
        })
        .completeAfterIntercept()
        .catch(() => {
          // Silently ignore timeout errors - this happens when test ends
          // before the interceptor is triggered, which is fine
        });

      return null;
    },

    /**
     * Register an interceptor with a custom condition.
     * Uses fire-and-forget pattern - doesn't wait for the intercept to complete.
     *
     * @param options.name - Unique name for this interceptor
     * @param options.responseMock - The response to return
     * @param options.matchUserMessage - If provided, only match requests where the last user message contains this string
     */
    registerLlmInterceptorWithCondition: ({
      name,
      responseMock,
      matchUserMessage,
    }: {
      name: string;
      responseMock: string | string[];
      matchUserMessage?: string;
    }): null => {
      if (!proxy) {
        throw new Error('LLM Proxy not started. Call cy.task("startLlmProxy") first.');
      }

      // Use completeAfterIntercept but don't await it - the response will be sent
      // when a matching request comes in. We catch any errors to prevent crashes
      // if the test ends before the interceptor is triggered.
      proxy
        .intercept({
          name,
          when: (body) => {
            if (!matchUserMessage) return true;

            const lastMessage = body.messages[body.messages.length - 1];
            return (
              lastMessage?.role === 'user' &&
              (lastMessage?.content as string)?.includes(matchUserMessage)
            );
          },
          responseMock,
        })
        .completeAfterIntercept()
        .catch(() => {
          // Silently ignore timeout errors - this happens when test ends
          // before the interceptor is triggered, which is fine
        });

      return null;
    },

    /**
     * Get all intercepted requests for assertions.
     * Returns an array of request bodies that were sent to the proxy.
     *
     * @example
     * cy.task('getLlmInterceptedRequests').then((requests) => {
     *   expect(requests).to.have.length(1);
     *   expect(requests[0].requestBody.messages[0].role).to.equal('system');
     * });
     */
    getLlmInterceptedRequests: (): Array<{
      requestBody: unknown;
      matchingInterceptorName: string | undefined;
    }> => {
      if (!proxy) {
        return [];
      }
      // Return a serializable copy of the intercepted requests
      return proxy.interceptedRequests.map((req) => ({
        requestBody: JSON.parse(JSON.stringify(req.requestBody)),
        matchingInterceptorName: req.matchingInterceptorName,
      }));
    },

    /**
     * Clear all interceptors and intercepted requests.
     * Call this in beforeEach() to reset state between tests.
     */
    clearLlmProxy: (): null => {
      if (proxy) {
        proxy.clear();
      }
      return null;
    },

    /**
     * Get the current proxy port, or null if not started.
     */
    getLlmProxyPort: (): number | null => {
      return proxy?.getPort() ?? null;
    },
  });
};
