/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { readWorkflowAgentToolCalls } from './read_workflow_agent_tool_calls';

jest.mock('p-retry', () => ({
  __esModule: true,
  default: (fn: () => Promise<unknown>) => fn(),
}));

const VALID_TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736';

const makeLog = (): ToolingLog =>
  ({
    debug: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
  } as unknown as ToolingLog);

describe('readWorkflowAgentToolCalls', () => {
  it('returns unavailable when traceId is missing', async () => {
    const result = await readWorkflowAgentToolCalls({
      traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
      traceId: undefined,
      log: makeLog(),
    });

    expect(result).toEqual({ toolCallIds: [], unavailable: true });
  });

  it('returns ordered tool ids after spans are exported', async () => {
    const esqlQuery = jest
      .fn()
      .mockResolvedValueOnce({
        columns: [{ name: 'span_count', type: 'long' }],
        values: [[2]],
      })
      .mockResolvedValueOnce({
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'tool_id', type: 'keyword' },
        ],
        values: [
          ['2026-01-01T00:00:00.000Z', 'platform.core.search'],
          ['2026-01-01T00:00:01.000Z', 'security.find_rules'],
        ],
      });

    const result = await readWorkflowAgentToolCalls({
      traceEsClient: { esql: { query: esqlQuery } } as unknown as EsClient,
      traceId: VALID_TRACE_ID,
      log: makeLog(),
    });

    expect(result).toEqual({
      toolCallIds: ['platform.core.search', 'security.find_rules'],
      unavailable: false,
    });
    expect(esqlQuery).toHaveBeenCalledTimes(2);
  });

  it('returns unavailable when trace export never arrives', async () => {
    const esqlQuery = jest.fn().mockResolvedValue({
      columns: [{ name: 'span_count', type: 'long' }],
      values: [[0]],
    });

    const result = await readWorkflowAgentToolCalls({
      traceEsClient: { esql: { query: esqlQuery } } as unknown as EsClient,
      traceId: VALID_TRACE_ID,
      log: makeLog(),
    });

    expect(result).toEqual({ toolCallIds: [], unavailable: true });
    expect(esqlQuery).toHaveBeenCalledTimes(1);
  });
});
