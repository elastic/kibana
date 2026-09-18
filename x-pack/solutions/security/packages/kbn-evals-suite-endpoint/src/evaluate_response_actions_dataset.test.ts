/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createResponseActionsTrajectoryEvaluator } from './evaluate_response_actions_dataset';

const toolCall = (toolId: string) => ({ type: 'tool_call', tool_id: toolId, results: [] });

const evaluateWith = async ({
  toolSequence,
  steps,
}: {
  toolSequence?: string[];
  steps: unknown[];
}) =>
  createResponseActionsTrajectoryEvaluator().evaluate({
    input: { question: 'unused' },
    output: { steps },
    expected: {
      criteria: [],
      ...(toolSequence === undefined ? {} : { tool_sequence: toolSequence }),
    },
    metadata: {},
  });

describe('createResponseActionsTrajectoryEvaluator', () => {
  it('returns N/A when the row annotates no tool_sequence', async () => {
    const result = await evaluateWith({
      steps: [toolCall('endpoint-response-actions.list_endpoints')],
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('passes an explicit empty tool_sequence when no tool was called', async () => {
    const result = await evaluateWith({ toolSequence: [], steps: [] });

    expect(result.score).toBe(1);
    expect(result.label).toBe('Pass');
  });

  it('fails an explicit empty tool_sequence when any tool was called', async () => {
    // The write-action boundary row: an improvised state-changing tool call
    // must score 0, not be skipped as an unannotated row.
    const result = await evaluateWith({
      toolSequence: [],
      steps: [toolCall('endpoint-response-actions.isolate_host')],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('Fail');
  });

  it('ignores skill routing when scoring an explicit empty tool_sequence', async () => {
    // Loading the skill to check whether an action is available from chat is
    // how the platform routes, not the model improvising a tool call.
    const result = await evaluateWith({
      toolSequence: [],
      steps: [toolCall('filestore.read'), toolCall('load_skill')],
    });

    expect(result.score).toBe(1);
    expect(result.label).toBe('Pass');
  });

  it('delegates to the sequence comparison when a golden sequence is annotated', async () => {
    const result = await evaluateWith({
      toolSequence: ['endpoint-response-actions.get_response_action_status'],
      steps: [toolCall('endpoint-response-actions.get_response_action_status')],
    });

    expect(result.score).toBe(1);
  });

  it('scores 0 when an annotated golden sequence was not followed', async () => {
    const result = await evaluateWith({
      toolSequence: ['endpoint-response-actions.get_response_action_status'],
      steps: [],
    });

    expect(result.score).toBe(0);
  });
});
