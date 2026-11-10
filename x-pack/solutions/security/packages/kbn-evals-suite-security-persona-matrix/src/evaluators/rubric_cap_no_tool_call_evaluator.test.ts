/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRubricCapNoToolCallEvaluator } from './rubric_cap_no_tool_call_evaluator';
import { buildOutput, toolCall } from '../__fixtures__/task_output_builders';

const run = (steps: unknown[]) =>
  createRubricCapNoToolCallEvaluator().evaluate({
    input: {},
    expected: {},
    output: buildOutput({ steps, answer: 'x' }),
    metadata: {},
  } as never);

describe('RubricCapNoToolCall', () => {
  it('caps at 6 and leaves the score null when no tool was called', async () => {
    const result = await run([{ type: 'reasoning', reasoning: 'thinking' }]);
    expect(result.score).toBeNull();
    expect(result.metadata).toEqual({ no_tool_call: true, rubric_cap: 6 });
  });

  it('does not cap when a tool was called', async () => {
    const result = await run([toolCall('security.alerts')]);
    expect(result.score).toBeNull();
    expect(result.metadata).toEqual({ no_tool_call: false, rubric_cap: null });
  });
});
