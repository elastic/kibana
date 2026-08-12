/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { readAgentToolCallsFromTraces } from './read_agent_tool_calls_from_traces';

/**
 * Contract: join on `gen_ai.conversation.id` (not workflow `trace.id`), filter
 * to TOOL spans, exclude filestore.read by default, and keep an explicit LIMIT
 * so ES|QL's implicit 1000-row cap cannot silently truncate trajectories.
 *
 * Multi-`ai.agent` workflows must pass every conversation id — a single id
 * silently drops later steps' tool spans.
 */

const silentLog = {
  warning: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as ToolingLog;

const mockClient = (
  responses: Array<{ columns: Array<{ name: string }>; values: unknown[][] }>
) => {
  const request = jest.fn();
  for (const response of responses) {
    request.mockResolvedValueOnce(response);
  }
  return { transport: { request } } as unknown as EsClient & {
    transport: { request: jest.Mock };
  };
};

describe('readAgentToolCallsFromTraces', () => {
  it('joins on gen_ai.conversation.id and filters to TOOL spans', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'attributes.gen_ai.tool.call.failed' }],
        values: [['platform.core.search', false]],
      },
    ]);

    await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
    });

    const queries = client.transport.request.mock.calls.map(
      (call) => (call[0] as { body: { query: string } }).body.query
    );
    expect(queries[0]).toContain('attributes.gen_ai.conversation.id == "conv-1"');
    expect(queries[0]).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(queries[0]).not.toContain('trace.id ==');
    expect(queries[0]).toContain('LIMIT 10000');
  });

  it('queries every conversation id for multi-agent workflows', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'attributes.gen_ai.tool.call.failed' }],
        values: [
          ['platform.core.search', false],
          ['platform.core.esql', false],
        ],
      },
    ]);

    const result = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: ['conv-draft', 'conv-review', 'conv-rewrite'],
      log: silentLog,
    });

    const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
      .query;
    expect(query).toContain(
      'attributes.gen_ai.conversation.id IN ("conv-draft", "conv-review", "conv-rewrite")'
    );
    expect(result.toolCallIds).toEqual(['platform.core.search', 'platform.core.esql']);
    expect(result.unavailable).toBe(false);
  });

  it('returns ordered tool ids and optional failures', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'attributes.gen_ai.tool.call.failed' }],
        values: [
          ['platform.core.search', false],
          ['platform.core.esql', true],
        ],
      },
    ]);

    const withFailures = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
      includeFailures: true,
    });

    expect(withFailures.toolCallIds).toEqual(['platform.core.search', 'platform.core.esql']);
    expect(withFailures.failedToolCallIds).toEqual(['platform.core.esql']);
  });

  it('marks unavailable when client or conversation ids are missing', async () => {
    await expect(
      readAgentToolCallsFromTraces({
        traceEsClient: undefined,
        conversationIds: 'c',
        log: silentLog,
      })
    ).resolves.toEqual({ toolCallIds: [], unavailable: true });

    const client = mockClient([]);
    await expect(
      readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: undefined,
        log: silentLog,
      })
    ).resolves.toEqual({ toolCallIds: [], unavailable: true });
  });

  it('bounds the tool query explicitly instead of inheriting the ES|QL row default', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }],
        values: [['platform.core.search']],
      },
    ]);

    await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
    });

    const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
      .query;
    expect(query).toContain('| LIMIT 10000');
  });
});
