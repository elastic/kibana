/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import { LlmCorrectnessEvaluationPrompt } from '@kbn/evals';
import { createCorrectnessAnalysis } from './correctness_analysis';

const analysis = {
  summary: {
    factual_accuracy_summary: 'ACCURATE',
    relevance_summary: 'RELEVANT',
    sequence_accuracy_summary: 'MATCH',
  },
  analysis: [],
};

const buildLog = () => ({ warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog);

const buildClient = (prompt: jest.Mock) => ({ prompt } as unknown as BoundInferenceClient);

describe('createCorrectnessAnalysis', () => {
  it('sends the shared correctness prompt with the question, last message and ground truth', async () => {
    const prompt = jest
      .fn()
      .mockResolvedValue({ toolCalls: [{ function: { arguments: analysis } }] });

    const result = await createCorrectnessAnalysis({
      inferenceClient: buildClient(prompt),
      log: buildLog(),
    })({
      input: { question: 'what happened?' },
      output: { messages: [{ message: 'first' }, { message: 'final answer' }] },
      expected: { expected: 'ground truth' },
    });

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(prompt.mock.calls[0][0]).toEqual({
      prompt: LlmCorrectnessEvaluationPrompt,
      input: {
        user_query: 'what happened?',
        agent_response: 'final answer',
        ground_truth_response: 'ground truth',
      },
      toolChoice: { function: 'analyze' },
    });
    expect(result.label).toBe('correctness-analysis');
    expect(result.explanation).toBe('Factuality: ACCURATE, Relevance: RELEVANT, Sequence: MATCH');
    expect(result.metadata).toEqual(analysis);
  });

  it('retries when the judge returns no tool call', async () => {
    const prompt = jest
      .fn()
      .mockResolvedValueOnce({ toolCalls: [] })
      .mockResolvedValue({ toolCalls: [{ function: { arguments: analysis } }] });
    const log = buildLog();

    const result = await createCorrectnessAnalysis({
      inferenceClient: buildClient(prompt),
      log,
    })({
      input: { question: 'q' },
      output: { messages: [{ message: 'a' }] },
      expected: { expected: 'e' },
    });

    expect(prompt).toHaveBeenCalledTimes(2);
    expect(log.warning).toHaveBeenCalledTimes(1);
    expect(result.metadata).toEqual(analysis);
  });
});
