/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAgentBuilderToolClassifier,
  getAgentBuilderToolCalls,
} from './agent_builder_tool_classifier';
import { createSecurityTrajectoryEvaluator } from './security_trajectory_evaluator';
import type { ToolCallClass, TrajectoryToolCall } from './agent_builder_tool_classifier';

describe('createSecurityTrajectoryEvaluator', () => {
  type Call = string | TrajectoryToolCall;
  const classes: Record<string, ToolCallClass> = {
    'attachments.read': 'runtime',
    write_todos: 'runtime',
    execute_api: 'scored',
    'security.alerts': 'scored',
  };
  const classifyTool = jest.fn(
    (call: TrajectoryToolCall): ToolCallClass => classes[call.id] ?? 'unclassified'
  );
  const evaluator = createSecurityTrajectoryEvaluator({
    extractToolCalls: (output: unknown) => (output as { tools: Call[] }).tools,
    goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
    classifyTool,
  });
  const run = (tools: Call[], expected: string[]) =>
    evaluator.evaluate({
      input: {},
      output: { tools },
      expected: { tools: expected },
      metadata: null,
    });

  beforeEach(() => classifyTool.mockClear());

  it('is the upstream trajectory evaluator contract', () => {
    expect(evaluator).toMatchObject({ name: 'trajectory', kind: 'CODE', direction: 'maximize' });
  });

  it('drops runtime tools before the no-tools-expected guardrail', async () => {
    const result = await run(['attachments.read', 'write_todos'], []);
    expect(result).toMatchObject({ score: 1, label: 'match' });
    expect(result.metadata).toEqual({ runtimeToolIds: ['attachments.read', 'write_todos'] });
  });

  it('still fails the guardrail for a scored tool next to runtime tools', async () => {
    const result = await run(['write_todos', 'attachments.read', 'execute_api'], []);
    expect(result).toMatchObject({ score: 0, label: 'unexpected-tools' });
  });

  it('drops runtime tools from order and coverage scoring', async () => {
    const result = await run(
      ['write_todos', 'security.alerts', 'attachments.read'],
      ['security.alerts']
    );
    expect(result.score).toBe(1);
    expect(result.metadata).toMatchObject({
      actual: ['security.alerts'],
      extraTools: [],
      runtimeToolIds: ['write_todos', 'attachments.read'],
    });
  });

  it('returns N/A naming every unclassified tool', async () => {
    const result = await run(
      ['security.alerts', 'brand_new_tool', 'other_new_tool', 'brand_new_tool'],
      ['security.alerts']
    );
    expect(result).toMatchObject({
      score: null,
      label: 'N/A',
      explanation: 'unclassified-tool:brand_new_tool,other_new_tool',
    });
    expect(result.metadata).toEqual({
      unclassifiedToolIds: ['brand_new_tool', 'other_new_tool'],
      runtimeToolIds: [],
    });
  });

  it('returns N/A rather than 0 when only an unclassified tool was called and none expected', async () => {
    expect(await run(['brand_new_tool'], [])).toMatchObject({ score: null, label: 'N/A' });
  });

  it('scores golden tools without consulting the classifier', async () => {
    const result = await run(['golden_custom_tool'], ['golden_custom_tool']);
    expect(result.score).toBe(1);
    expect(classifyTool).not.toHaveBeenCalled();
  });

  it('passes the call origin to the classifier', async () => {
    await run([{ id: 'security.alerts', origin: 'registry' }], []);
    expect(classifyTool).toHaveBeenCalledWith({ id: 'security.alerts', origin: 'registry' });
  });

  it('keeps the upstream LCS order and coverage score', async () => {
    const result = await run(
      ['security.alerts', 'execute_api'],
      ['execute_api', 'security.alerts']
    );
    expect(result.score).toBeCloseTo(0.5 * 0.5 + 0.5 * 1);
    expect(result.metadata).toMatchObject({ lcsLength: 1, missingTools: [], extraTools: [] });
  });

  it('honours custom order/coverage weights', async () => {
    const weighted = createSecurityTrajectoryEvaluator({
      extractToolCalls: (output: unknown) => (output as { tools: Call[] }).tools,
      goldenPathExtractor: (expected: unknown) => (expected as { tools: string[] }).tools,
      classifyTool,
      orderWeight: 1,
      coverageWeight: 0,
    });
    const result = await weighted.evaluate({
      input: {},
      output: { tools: ['security.alerts', 'execute_api'] },
      expected: { tools: ['execute_api', 'security.alerts'] },
      metadata: null,
    });
    expect(result.score).toBeCloseTo(0.5);
  });

  it('reads the tool origin from converse round steps by default', async () => {
    const converse = createSecurityTrajectoryEvaluator({
      classifyTool: (call) => (call.origin === 'internal' ? 'runtime' : 'scored'),
      goldenPathExtractor: () => [],
    });
    const run2 = (steps: unknown[]) =>
      converse.evaluate({ input: {}, output: { steps }, expected: {}, metadata: null });

    // Reads only its attachment: upstream getToolCallSteps would score this 0.
    expect(
      await run2([{ type: 'tool_call', tool_id: 'attachments.read', tool_origin: 'internal' }])
    ).toMatchObject({ score: 1, label: 'match' });
    expect(
      await run2([{ type: 'tool_call', tool_id: 'platform.core.search', tool_origin: 'registry' }])
    ).toMatchObject({ score: 0, label: 'unexpected-tools' });
  });
});

describe('createSecurityTrajectoryEvaluator on a converse response', () => {
  // Round steps of an Agent Builder converse call that only reads its own attachment, trimmed to
  // the fields the evaluator can see. `tool_origin: 'internal'` is what the runtime records.
  const converseOutput = {
    conversation_id: 'conversation-1',
    steps: [
      {
        type: 'reasoning',
        reasoning: 'I need to read the attachment to find the code word.',
      },
      {
        type: 'tool_call',
        tool_call_id: 'tooluse_1',
        tool_id: 'attachments.read',
        params: { attachment_id: 'attachment-1' },
        results: [{ tool_result_id: 'result-1', type: 'other', data: { content: 'PINEAPPLE-42' } }],
        tool_origin: 'internal',
        tool_type: 'builtin',
      },
    ],
    response: { message: 'The code word is PINEAPPLE-42.' },
  };

  const evaluate = (
    expected: { tools: string[] },
    classifyTool = createAgentBuilderToolClassifier()
  ) =>
    createSecurityTrajectoryEvaluator({
      classifyTool,
      goldenPathExtractor: (golden) => (golden as { tools: string[] }).tools,
    }).evaluate({ input: {}, output: converseOutput, expected, metadata: null });

  it('reads only the tool_call steps, with their origin', () => {
    expect(getAgentBuilderToolCalls(converseOutput)).toEqual([
      { id: 'attachments.read', origin: 'internal' },
    ]);
  });

  it('scores a run that only reads its attachment as a match for an empty golden path', async () => {
    expect(await evaluate({ tools: [] })).toMatchObject({ score: 1, label: 'match' });
  });
});
