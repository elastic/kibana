/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { Evaluator } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  createPersonaMatrixInputTokensEvaluator,
  createPersonaMatrixLatencyEvaluator,
  createPersonaMatrixOutputTokensEvaluator,
  createPersonaMatrixToolCallsEvaluator,
} from './trace_evaluators';
import { TRACE_INDEX_PATTERN } from './trace_index_pattern';

const TRACE_ID = '0af7651916cd43dd8448eb211c80319c';

const log = { debug: jest.fn(), warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog;

const runWith = async (
  create: (deps: { traceEsClient: EsClient; log: ToolingLog }) => Evaluator,
  response: { columns: Array<{ name: string; type: string }>; values: unknown[][] }
) => {
  const query = jest.fn().mockResolvedValue(response);
  const evaluator = create({ traceEsClient: { esql: { query } } as unknown as EsClient, log });
  const result = await evaluator.evaluate({
    input: {},
    expected: {},
    output: { traceId: TRACE_ID },
    metadata: {},
  } as never);
  return { result, queries: query.mock.calls.map(([{ query: q }]) => q as string) };
};

describe('suite-local trace evaluators', () => {
  // The shared evaluators query `FROM traces-*`; on a remote tracing cluster
  // that pattern resolves to zero authorized indices and every retry fails.
  it.each([
    [
      'Input Tokens',
      createPersonaMatrixInputTokensEvaluator,
      { columns: [{ name: 'input_tokens', type: 'long' }], values: [[1200]] },
      1200,
    ],
    [
      'Output Tokens',
      createPersonaMatrixOutputTokensEvaluator,
      { columns: [{ name: 'output_tokens', type: 'long' }], values: [[340]] },
      340,
    ],
    [
      'Tool Calls',
      createPersonaMatrixToolCallsEvaluator,
      { columns: [{ name: 'tool_calls', type: 'long' }], values: [[4]] },
      4,
    ],
    [
      'Latency',
      createPersonaMatrixLatencyEvaluator,
      { columns: [{ name: 'latency_seconds', type: 'double' }], values: [[12.5]] },
      12.5,
    ],
  ])(
    '%s reads the widened trace index pattern and scores the extracted value',
    async (_name, create, response, expected) => {
      const { result, queries } = await runWith(create, response);
      expect(queries).toHaveLength(1);
      expect(queries[0]).toContain(`FROM ${TRACE_INDEX_PATTERN}`);
      expect(queries[0]).not.toMatch(/FROM traces-\*\s/);
      expect(queries[0]).toContain(`trace.id == "${TRACE_ID}"`);
      expect(result.score).toBe(expected);
    }
  );

  it('keeps the shared evaluators’ names and directions', () => {
    const deps = { traceEsClient: {} as EsClient, log };
    expect(createPersonaMatrixInputTokensEvaluator(deps)).toMatchObject({
      name: 'Input Tokens',
      direction: 'minimize',
    });
    expect(createPersonaMatrixOutputTokensEvaluator(deps)).toMatchObject({
      name: 'Output Tokens',
      direction: 'minimize',
    });
    expect(createPersonaMatrixToolCallsEvaluator(deps)).toMatchObject({
      name: 'Tool Calls',
      direction: 'neutral',
    });
    expect(createPersonaMatrixLatencyEvaluator(deps)).toMatchObject({
      name: 'Latency',
      direction: 'minimize',
    });
  });
});
