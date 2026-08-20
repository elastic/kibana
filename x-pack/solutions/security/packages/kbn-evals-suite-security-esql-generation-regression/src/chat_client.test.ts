/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { EsqlRegressionAgentBuilderChatClient } from './chat_client';

const buildLog = (): ToolingLog => {
  // The chat client only writes warnings / errors during retry — a plain
  // tooling log silenced via ignoreCalls is enough for these tests.
  return new ToolingLog({ level: 'silent', writeTo: process.stdout });
};

describe('EsqlRegressionAgentBuilderChatClient', () => {
  it('returns the assistant message when the agent emits free-form text', async () => {
    const fetch = jest.fn().mockResolvedValueOnce({
      conversation_id: 'conv-1',
      trace_id: 'trace-1',
      steps: [{ type: 'tool_call', tool_id: 'platform.core.generate_esql' }],
      response: { message: 'Here is the query you asked for.' },
    });

    const client = new EsqlRegressionAgentBuilderChatClient(fetch as never, buildLog(), 'conn');

    const result = await client.converse({ message: 'hi' });

    expect(result.messages).toEqual([{ message: 'Here is the query you asked for.' }]);
    expect(result.steps).toHaveLength(1);
    expect(result.conversationId).toBe('conv-1');
    expect(result.traceId).toBe('trace-1');
    expect(result.errors).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns an empty message (NOT a TypeError) for tool-only turns where response.message is absent', async () => {
    // Regression for Garrett Spong's review comment on PR #268787:
    // the server contract is `Partial<AssistantResponse>` so for tool-only
    // turns (agent answered through generate_esql / execute_esql) the
    // `response.message` field can be missing. Dereferencing `.message`
    // unguarded used to throw `TypeError: Cannot read properties of
    // undefined (reading 'message')`, which `pRetry` then retried two
    // more times before the outer catch dropped the `steps` payload —
    // exactly what the extractor needs to recover the ES|QL query.
    const fetch = jest.fn().mockResolvedValueOnce({
      conversation_id: 'conv-2',
      trace_id: 'trace-2',
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.execute_esql',
          results: [
            {
              type: 'esql_results',
              data: { query: 'FROM logs-* | LIMIT 10' },
            },
          ],
        },
      ],
      // No `response` field at all, mirroring what the server can emit
      // when the agent surfaces its answer entirely through tool calls.
    });

    const client = new EsqlRegressionAgentBuilderChatClient(fetch as never, buildLog(), 'conn');

    const result = await client.converse({ message: 'show me 10 logs' });

    expect(result.messages).toEqual([{ message: '' }]);
    expect(result.steps).toHaveLength(1);
    expect(result.errors).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('returns an empty message when response exists but message is undefined', async () => {
    const fetch = jest.fn().mockResolvedValueOnce({
      conversation_id: 'conv-3',
      steps: [],
      response: {}, // present but message-less
    });

    const client = new EsqlRegressionAgentBuilderChatClient(fetch as never, buildLog(), 'conn');

    const result = await client.converse({ message: 'noop' });

    expect(result.messages).toEqual([{ message: '' }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
