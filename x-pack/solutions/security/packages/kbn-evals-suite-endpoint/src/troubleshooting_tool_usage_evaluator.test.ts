/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTroubleshootingToolUsageEvaluator,
  GENERATE_INSIGHT_TOOL_ID,
} from './troubleshooting_tool_usage_evaluator';

const ARTIFACTS_TOOL_ID = 'automatic_troubleshooting.get_endpoint_artifacts';

const toolCall = (toolId: string, resultType = 'other') => ({
  type: 'tool_call',
  tool_id: toolId,
  results: [{ type: resultType }],
});

const evaluateWith = async ({
  steps,
  maxToolCalls,
  forbiddenTools,
}: {
  steps: unknown[];
  maxToolCalls?: number;
  forbiddenTools?: readonly string[];
}) =>
  createTroubleshootingToolUsageEvaluator().evaluate({
    input: { question: 'unused' },
    output: { steps },
    expected: {
      criteria: [],
      ...(maxToolCalls !== undefined ? { max_tool_calls: maxToolCalls } : {}),
      ...(forbiddenTools ? { forbidden_tools: forbiddenTools } : {}),
    },
    metadata: {},
  });

describe('troubleshooting tool id contract', () => {
  it('mirrors the generate_insight tool id of the automatic troubleshooting skill', () => {
    expect(GENERATE_INSIGHT_TOOL_ID).toBe('automatic_troubleshooting.generate_insight');
  });
});

describe('createTroubleshootingToolUsageEvaluator', () => {
  it('passes when the tool calls are within budget and no forbidden tool is called', async () => {
    const result = await evaluateWith({
      steps: [toolCall(ARTIFACTS_TOOL_ID), toolCall(ARTIFACTS_TOOL_ID)],
      maxToolCalls: 2,
      forbiddenTools: [GENERATE_INSIGHT_TOOL_ID],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('ignores non tool call steps when counting tool calls', async () => {
    const result = await evaluateWith({
      steps: [{ type: 'reasoning', reasoning: 'thinking' }, toolCall(ARTIFACTS_TOOL_ID)],
      maxToolCalls: 1,
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it('passes when generate_insight fails once and is not called again', async () => {
    const result = await evaluateWith({
      steps: [toolCall(ARTIFACTS_TOOL_ID), toolCall(GENERATE_INSIGHT_TOOL_ID, 'error')],
    });

    expect(result).toEqual({ score: 1, label: 'pass' });
  });

  it.each([
    {
      name: 'the tool calls exceed the budget',
      steps: [toolCall(ARTIFACTS_TOOL_ID), toolCall(ARTIFACTS_TOOL_ID)],
      maxToolCalls: 1,
    },
    {
      name: 'a forbidden tool is called',
      steps: [toolCall(ARTIFACTS_TOOL_ID), toolCall(GENERATE_INSIGHT_TOOL_ID)],
      forbiddenTools: [GENERATE_INSIGHT_TOOL_ID],
    },
    {
      name: 'generate_insight is called again after it returned an error',
      steps: [
        toolCall(GENERATE_INSIGHT_TOOL_ID, 'error'),
        toolCall(ARTIFACTS_TOOL_ID),
        toolCall(GENERATE_INSIGHT_TOOL_ID, 'other'),
      ],
    },
  ])('fails when $name', async ({ steps, maxToolCalls, forbiddenTools }) => {
    const result = await evaluateWith({ steps, maxToolCalls, forbiddenTools });

    expect(result).toEqual({ score: 0, label: 'fail' });
  });
});
