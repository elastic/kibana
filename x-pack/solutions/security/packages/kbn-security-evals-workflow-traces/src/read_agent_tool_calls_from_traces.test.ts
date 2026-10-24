/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { toHashedId } from '@kbn/agent-builder-server';
import { readAgentToolCallsFromTraces } from './read_agent_tool_calls_from_traces';

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
        columns: [{ name: 'tool_id' }, { name: 'event.outcome' }],
        values: [['platform.core.search', 'success']],
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
    expect(queries[0]).toContain('attributes.gen_ai.conversation.id IN ("conv-1"');
    expect(queries[0]).toContain('attributes.elastic.inference.span.kind == "TOOL"');
    expect(queries[0]).not.toContain('trace.id ==');
    expect(queries[0]).toContain('LIMIT 10000');
  });

  it('queries every conversation id for multi-agent workflows', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'event.outcome' }],
        values: [
          ['platform.core.search', 'success'],
          ['platform.core.esql', 'success'],
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
    // Each id is present; the clause also carries each id's hashed variant, so
    // this asserts membership rather than an exact closed list.
    for (const id of ['conv-draft', 'conv-review', 'conv-rewrite']) {
      expect(query).toContain(`"${id}"`);
    }
    expect(query).toContain('attributes.gen_ai.conversation.id IN (');
    expect(result.toolCallIds).toEqual(['platform.core.search', 'platform.core.esql']);
    expect(result.unavailable).toBe(false);
  });

  it('returns ordered tool ids and optional failures', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'event.outcome' }],
        values: [
          ['platform.core.search', 'success'],
          ['platform.core.esql', 'failure'],
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

  it('probes the same index pattern when no tool spans match, and accepts empty when spans exist', async () => {
    const request = jest.fn(async ({ body }: { body: { query: string } }) =>
      body.query.includes('STATS')
        ? { columns: [{ name: 'span_count' }], values: [[3]] }
        : { columns: [{ name: 'tool_id' }], values: [] }
    );
    const client = { transport: { request } } as unknown as EsClient;

    const result = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
      indexPattern: 'traces-apm.custom-*',
    });

    expect(result).toEqual({ toolCallIds: [], unavailable: false });
    expect(request).toHaveBeenCalledTimes(2); // no retry: spans exist, agent called no tools
    const probeQuery = request.mock.calls[1][0].body.query;
    expect(probeQuery).toContain('FROM traces-apm.custom-*');
    expect(probeQuery).toContain('STATS span_count = COUNT(*)');
  });

  it('retries while the probe finds no spans, then reports unavailable', async () => {
    const request = jest.fn(async ({ body }: { body: { query: string } }) =>
      body.query.includes('STATS')
        ? { columns: [{ name: 'span_count' }], values: [[0]] }
        : { columns: [{ name: 'tool_id' }], values: [] }
    );
    const client = { transport: { request } } as unknown as EsClient;

    const result = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
    });

    expect(result).toEqual({ toolCallIds: [], unavailable: true });
    // 1 initial attempt + 5 retries, each a tool query + a probe.
    expect(request).toHaveBeenCalledTimes(12);
  }, 20000); // backoff across 5 retries is ~15s of wall clock

  it('dedupes repeated conversation ids before building the join', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }],
        values: [['platform.core.search']],
      },
    ]);

    await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: ['conv-1', 'conv-1', 'conv-2'],
      log: silentLog,
    });

    const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
      .query;
    // Dedupe is what this test guards: each raw id appears exactly once even
    // though it was supplied twice.
    expect(query.split('"conv-1"').length - 1).toBe(1);
    expect(query.split('"conv-2"').length - 1).toBe(1);
  });
  it('keeps the failure column out of KEEP unless failures are requested', async () => {
    const client = mockClient([
      { columns: [{ name: 'tool_id' }], values: [['platform.core.search']] },
    ]);

    await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
    });

    const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
      .query;
    // Unmapped on real traces indices until a span sets it; naming it in KEEP
    // makes ES|QL reject the whole query.
    expect(query).not.toContain('attributes.gen_ai.tool.call.failed');
    expect(query).toContain('| KEEP @timestamp, tool_id');
  });

  it('reads failures from the ECS-baseline event.outcome column (#288266)', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'event.outcome' }],
        values: [
          ['platform.core.esql', 'failure'],
          ['security.create_detection_rule', 'success'],
        ],
      },
    ]);

    const result = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
      includeFailures: true,
    });

    const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
      .query;
    // The unmapped gen_ai column must never appear in the query: on Scout trace
    // mappings it is a hard verification_exception (#288266).
    expect(query).not.toContain('attributes.gen_ai.tool.call.failed');
    expect(query).toContain('event.outcome');
    expect(result.failedToolCallIds).toEqual(['platform.core.esql']);
    expect(result.toolCallIds).toEqual(['platform.core.esql', 'security.create_detection_rule']);
  });

  it('does not classify the ECS unknown outcome as a failed tool call', async () => {
    const client = mockClient([
      {
        columns: [{ name: 'tool_id' }, { name: 'event.outcome' }],
        values: [['platform.core.esql', 'unknown']],
      },
    ]);

    const result = await readAgentToolCallsFromTraces({
      traceEsClient: client,
      conversationIds: 'conv-1',
      log: silentLog,
      includeFailures: true,
    });

    expect(result.toolCallIds).toEqual(['platform.core.esql']);
    expect(result.failedToolCallIds).toEqual([]);
  });

  describe('anonymized conversation ids', () => {
    // AgentBuilderSpanProcessor hashes gen_ai.conversation.id before export
    // unless agentBuilder:tracing:includeRealIds is on, and it defaults to off.
    // Real value produced by toHashedId (sha256 hex, first 16 chars).
    const REAL_ID = 'c9682441-2d72-4e5f-9a1b-0c3d4e5f6a7b';
    // Hardcoded on purpose: computing it with toHashedId here would assert the
    // implementation against itself. Independently reproducible with
    // `node -e 'console.log(require("crypto").createHash("sha256").update("<REAL_ID>").digest("hex").slice(0,16))'`
    const HASHED_ID = 'cccbfba40403ea00';

    it('matches the hash Agent Builder writes onto spans', () => {
      // Guards drift: if toHashedId's scheme changes, the evaluator's join
      // silently stops matching and tool metrics go quietly empty.
      expect(toHashedId(REAL_ID)).toBe(HASHED_ID);
    });

    it('queries the hashed conversation id, not just the raw workflow id', async () => {
      const client = mockClient([
        { columns: [{ name: 'tool_id' }], values: [['platform.core.search']] },
      ]);

      await readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: REAL_ID,
        log: silentLog,
      });

      const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
        .query;
      // Without this the join matches nothing on a default stack and the suite
      // reports "no agent TOOL spans" instead of the real trajectory.
      expect(query).toContain(HASHED_ID);
      expect(HASHED_ID).toHaveLength(16);
    });

    it('still queries the raw id so includeRealIds stacks keep working', async () => {
      const client = mockClient([
        { columns: [{ name: 'tool_id' }], values: [['platform.core.search']] },
      ]);

      await readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: REAL_ID,
        log: silentLog,
      });

      const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
        .query;
      expect(query).toContain(REAL_ID);
      expect(query).toContain(' IN (');
    });

    it('resolves tool calls when spans carry only the hashed id', async () => {
      const client = mockClient([
        {
          columns: [{ name: 'tool_id' }],
          values: [['platform.core.search'], ['platform.core.esql']],
        },
      ]);

      const result = await readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: REAL_ID,
        log: silentLog,
      });

      expect(result).toEqual({
        toolCallIds: ['platform.core.search', 'platform.core.esql'],
        unavailable: false,
      });
    });

    it('does not emit duplicate variants for an already-hashed id', async () => {
      const client = mockClient([
        { columns: [{ name: 'tool_id' }], values: [['platform.core.search']] },
      ]);

      await readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: [REAL_ID, REAL_ID],
        log: silentLog,
      });

      const query = (client.transport.request.mock.calls[0][0] as { body: { query: string } }).body
        .query;
      expect(query.split(HASHED_ID).length - 1).toBe(1);
      expect(query.split(`"${REAL_ID}"`).length - 1).toBe(1);
    });

    it('rejects hashed ids that would break out of the ES|QL literal', async () => {
      const client = mockClient([
        { columns: [{ name: 'tool_id' }], values: [['platform.core.search']] },
      ]);

      const result = await readAgentToolCallsFromTraces({
        traceEsClient: client,
        conversationIds: 'conv"-injection',
        log: silentLog,
      });

      expect(result.unavailable).toBe(true);
    });
  });
});
