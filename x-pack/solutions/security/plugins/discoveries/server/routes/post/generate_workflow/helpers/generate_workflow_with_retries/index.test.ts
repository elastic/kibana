/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { RunAgentFn, RunAgentReturn } from '@kbn/agent-builder-server/agents';
import type { ConversationRound } from '@kbn/agent-builder-common';

import {
  generateWorkflowWithRetries,
  DEFAULT_MAX_RETRIES,
  type GenerateWorkflowWithRetriesResult,
} from '.';

const mockRequest = {} as KibanaRequest;

const VALID_WORKFLOW_YAML = `name: high-severity-alerts
version: '1'
description: Retrieve high-severity alerts from the last 24 hours
triggers:
  - type: manual
steps:
  - name: retrieve-alerts
    type: elasticsearch.search
    with:
      request:
        method: GET
        path: /.alerts-security.alerts-*/_search
        body:
          size: 100
          query:
            bool:
              filter:
                - range:
                    "@timestamp":
                      gte: "now-24h"`;

const VALID_RESPONSE_WITH_FENCE = `Here is the workflow:\n\n\`\`\`yaml\n${VALID_WORKFLOW_YAML}\n\`\`\``;

const INVALID_WORKFLOW_YAML = `name: ""
triggers: []
steps: []`;

const INVALID_RESPONSE_WITH_FENCE = `\`\`\`yaml\n${INVALID_WORKFLOW_YAML}\n\`\`\``;

const createMockRound = (message: string): ConversationRound =>
  ({
    id: 'round-1',
    response: { message },
    status: 'completed',
  } as unknown as ConversationRound);

const createMockRunAgent = (
  ...responses: Array<RunAgentReturn | Error>
): jest.MockedFunction<RunAgentFn> => {
  const fn = jest.fn<ReturnType<RunAgentFn>, Parameters<RunAgentFn>>();

  for (const response of responses) {
    if (response instanceof Error) {
      fn.mockRejectedValueOnce(response);
    } else {
      fn.mockResolvedValueOnce(response);
    }
  }

  return fn;
};

const createMockLogger = (): jest.Mocked<Logger> =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as jest.Mocked<Logger>);

describe('generateWorkflowWithRetries', () => {
  const baseParams = {
    agentId: 'test-agent',
    connectorId: 'test-connector',
    description: 'Retrieve high-severity alerts from the last 24 hours',
    request: mockRequest,
  };

  describe('successful generation', () => {
    it('returns a valid workflow on the first attempt', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });

      const result: GenerateWorkflowWithRetriesResult = await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.retries).toBe(0);
        expect(result.workflow.name).toBe('high-severity-alerts');
        expect(result.yaml).toBe(VALID_WORKFLOW_YAML);
      }
    });

    it('invokes the agent only once on first-attempt success', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });

      await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(mockRunAgent).toHaveBeenCalledTimes(1);
    });

    it('sends the description in the initial prompt', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });

      await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      const callArgs = mockRunAgent.mock.calls[0][0];
      expect(callArgs.agentParams.nextInput.message).toContain(baseParams.description);
    });

    it('passes configurationOverrides to the agent invocation', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });
      const configurationOverrides = {
        instructions: 'Custom skill instructions',
        tools: [{ tool_ids: ['platform.core.generate_esql'] }],
      };

      await generateWorkflowWithRetries({
        ...baseParams,
        configurationOverrides,
        runAgent: mockRunAgent,
      });

      const callArgs = mockRunAgent.mock.calls[0][0];
      expect(callArgs.agentParams.configurationOverrides).toEqual(configurationOverrides);
    });
  });

  describe('retry behavior', () => {
    it('retries on validation failure and succeeds on a later attempt', async () => {
      const mockRunAgent = createMockRunAgent(
        // First attempt: invalid YAML
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        // Second attempt: valid YAML
        { result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) } }
      );

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.retries).toBe(1);
        expect(result.workflow.name).toBe('high-severity-alerts');
      }
      expect(mockRunAgent).toHaveBeenCalledTimes(2);
    });

    it('includes validation errors in the retry prompt', async () => {
      const mockRunAgent = createMockRunAgent(
        // First attempt: invalid YAML
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        // Second attempt: valid YAML
        { result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) } }
      );

      await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      const retryCallArgs = mockRunAgent.mock.calls[1][0];
      const retryMessage = retryCallArgs.agentParams.nextInput.message ?? '';
      expect(retryMessage).toContain('Validation errors');
      expect(retryMessage).toContain('failed validation');
    });

    it('retries on YAML extraction failure', async () => {
      const mockRunAgent = createMockRunAgent(
        // First attempt: response with no YAML
        {
          result: {
            round: createMockRound('I could not generate a workflow.'),
          },
        },
        // Second attempt: valid YAML
        { result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) } }
      );

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.retries).toBe(1);
      }
    });

    it('retries on agent invocation failure', async () => {
      const mockRunAgent = createMockRunAgent(
        // First attempt: agent error
        new Error('Connection timeout'),
        // Second attempt: valid response
        { result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) } }
      );

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.retries).toBe(1);
      }
    });

    it('defaults to 3 max retries', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(3);
    });

    it('respects custom maxRetries', async () => {
      const mockRunAgent = createMockRunAgent(
        // All attempts return invalid YAML
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } }
      );

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        maxRetries: 1,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(false);
      // 1 initial + 1 retry = 2 total calls
      expect(mockRunAgent).toHaveBeenCalledTimes(2);
    });
  });

  describe('exhausted retries', () => {
    it('returns a failure after exhausting all retry attempts', async () => {
      const mockRunAgent = createMockRunAgent(
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } },
        { result: { round: createMockRound(INVALID_RESPONSE_WITH_FENCE) } }
      );

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('failed after');
        expect(result.retries).toBe(DEFAULT_MAX_RETRIES);
      }
    });

    it('includes the last error in the failure message', async () => {
      const mockRunAgent = createMockRunAgent(new Error('first error'), new Error('second error'));

      const result = await generateWorkflowWithRetries({
        ...baseParams,
        maxRetries: 1,
        runAgent: mockRunAgent,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('second error');
      }
    });
  });

  describe('abort signal', () => {
    it('passes the abort signal to the agent invocation', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });
      const abortController = new AbortController();

      await generateWorkflowWithRetries({
        ...baseParams,
        abortSignal: abortController.signal,
        runAgent: mockRunAgent,
      });

      expect(mockRunAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          abortSignal: abortController.signal,
        })
      );
    });
  });

  describe('logging', () => {
    it('logs debug messages when a logger is provided', async () => {
      const logger = createMockLogger();
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });

      await generateWorkflowWithRetries({
        ...baseParams,
        logger,
        runAgent: mockRunAgent,
      });

      // Logger.debug is called with lazy evaluation functions
      expect(logger.debug).toHaveBeenCalled();
    });

    it('does not throw when no logger is provided', async () => {
      const mockRunAgent = createMockRunAgent({
        result: { round: createMockRound(VALID_RESPONSE_WITH_FENCE) },
      });

      await expect(
        generateWorkflowWithRetries({
          ...baseParams,
          runAgent: mockRunAgent,
        })
      ).resolves.not.toThrow();
    });
  });
});
