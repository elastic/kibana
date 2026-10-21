/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import {
  createForensicTrajectoryEvaluator,
  wrapSkillInvocationForDistractors,
  type ForensicDatasetExample,
} from './evaluate_forensic_dataset';

const toolCallOutput = (toolIds: string[]): TaskOutput =>
  ({
    messages: [],
    errors: [],
    steps: toolIds.map((toolId, index) => ({
      type: 'tool_call',
      tool_id: toolId,
      tool_call_id: `call-${index}`,
      params: {},
      results: [],
    })),
  } as unknown as TaskOutput);

describe('createForensicTrajectoryEvaluator', () => {
  const GOLDEN = [
    'osquery.check_integration',
    'osquery.list_saved_queries',
    'osquery.resolve_agent_ids',
    'osquery.run_live_query',
  ];

  it('does not award full coverage when a golden tool was never called', async () => {
    const evaluator = createForensicTrajectoryEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'live processes?' },
      // resolve_agent_ids missing — the exact gap review finding 16 describes.
      output: toolCallOutput([
        'osquery.check_integration',
        'osquery.list_saved_queries',
        'osquery.run_live_query',
      ]),
      expected: { criteria: [], tool_sequence: GOLDEN },
      metadata: { row_type: 'happy' },
    });

    expect(typeof result.score).toBe('number');
    expect(result.score as number).toBeLessThan(1);
    expect(result.metadata?.missing_golden_tools).toEqual(['osquery.resolve_agent_ids']);
  });

  it('still allows a full score when every golden tool ran', async () => {
    const evaluator = createForensicTrajectoryEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'live processes?' },
      output: toolCallOutput(GOLDEN),
      expected: { criteria: [], tool_sequence: GOLDEN },
      metadata: { row_type: 'happy' },
    });

    expect(result.score).toBe(1);
    expect(result.metadata?.missing_golden_tools).toBeUndefined();
  });

  it('skips evaluation when no tool_sequence is annotated', async () => {
    const evaluator = createForensicTrajectoryEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'patient zero?' },
      output: toolCallOutput(['platform.core.execute_esql']),
      expected: { criteria: [] },
      metadata: { row_type: 'happy' },
    });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});

describe('wrapSkillInvocationForDistractors', () => {
  const inner: Evaluator<ForensicDatasetExample, TaskOutput> = {
    name: 'Skill Invoked (test)',
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async () => ({ score: 0, label: 'not_invoked' }),
  };

  it('inverts score 0 to 1 for distractor examples', async () => {
    const wrapped = wrapSkillInvocationForDistractors(inner);
    const result = await wrapped.evaluate({
      input: { question: 'weather?' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { row_type: 'distractor' },
    });

    expect(result.score).toBe(1);
  });

  it('inverts score 1 to 0 for distractor examples', async () => {
    const invoked: Evaluator<ForensicDatasetExample, TaskOutput> = {
      ...inner,
      evaluate: async () => ({ score: 1, label: 'invoked' }),
    };
    const wrapped = wrapSkillInvocationForDistractors(invoked);
    const result = await wrapped.evaluate({
      input: { question: 'weather?' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { row_type: 'distractor' },
    });

    expect(result.score).toBe(0);
  });

  it('does not invert happy-path examples', async () => {
    const wrapped = wrapSkillInvocationForDistractors(inner);
    const result = await wrapped.evaluate({
      input: { question: 'patient zero?' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { row_type: 'happy' },
    });

    expect(result.score).toBe(0);
  });

  it('preserves null scores for distractors (N/A)', async () => {
    const na: Evaluator<ForensicDatasetExample, TaskOutput> = {
      ...inner,
      evaluate: async () => ({ score: null, label: 'N/A' }),
    };
    const wrapped = wrapSkillInvocationForDistractors(na);
    const result = await wrapped.evaluate({
      input: { question: 'weather?' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { row_type: 'distractor' },
    });

    expect(result.score).toBeNull();
  });

  it('does not invert potentially_incomplete distractor scores', async () => {
    const incomplete: Evaluator<ForensicDatasetExample, TaskOutput> = {
      ...inner,
      evaluate: async () => ({
        score: 0,
        label: 'potentially_incomplete',
        metadata: { incomplete: true },
        explanation: 'trace indexing lag',
      }),
    };
    const wrapped = wrapSkillInvocationForDistractors(incomplete);
    const result = await wrapped.evaluate({
      input: { question: 'weather?' },
      output: { messages: [], steps: [], errors: [] },
      expected: { criteria: [] },
      metadata: { row_type: 'distractor' },
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('potentially_incomplete');
  });
});
