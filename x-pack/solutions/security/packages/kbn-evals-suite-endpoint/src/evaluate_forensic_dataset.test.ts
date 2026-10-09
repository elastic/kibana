/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, TaskOutput } from '@kbn/evals';
import {
  wrapSkillInvocationForDistractors,
  type ForensicDatasetExample,
} from './evaluate_forensic_dataset';

describe('wrapSkillInvocationForDistractors', () => {
  const inner: Evaluator<ForensicDatasetExample, TaskOutput> = {
    name: 'Skill Invoked (test)',
    kind: 'CODE',
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
