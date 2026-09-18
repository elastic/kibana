/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { AiSocEvalChatClient } from './chat_client';

describe('AiSocEvalChatClient', () => {
  const fetchMock = jest.fn();
  const logMock = {
    info: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog;

  const createClient = () =>
    new AiSocEvalChatClient(fetchMock as unknown as HttpHandler, logMock, 'test-connector');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('converse', () => {
    it('rejects an empty messages array instead of masking the failure as an API error', async () => {
      await expect(createClient().converse({ messages: [] })).rejects.toThrow(
        /at least one message/
      );

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends the last message as the converse input and appends the response', async () => {
      fetchMock.mockResolvedValue({
        conversation_id: 'conversation-1',
        trace_id: 'trace-1',
        steps: [],
        response: { message: 'the answer' },
      });

      const response = await createClient().converse({
        messages: [{ message: 'first' }, { message: 'second' }],
        conversationId: 'conversation-0',
        agentId: 'agent-1',
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [path, { body }] = fetchMock.mock.calls[0];
      expect(path).toBe('/api/agent_builder/converse');
      expect(JSON.parse(body)).toEqual({
        agent_id: 'agent-1',
        connector_id: 'test-connector',
        conversation_id: 'conversation-0',
        input: 'second',
      });
      expect(response).toEqual({
        conversationId: 'conversation-1',
        messages: [{ message: 'first' }, { message: 'second' }, { message: 'the answer' }],
        steps: [],
        traceId: 'trace-1',
        errors: [],
      });
    });
  });
});
