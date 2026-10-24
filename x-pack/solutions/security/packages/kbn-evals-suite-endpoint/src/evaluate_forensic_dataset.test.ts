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

const taskOutputWith = (toolIds: string[]): TaskOutput => ({
  messages: [],
  steps: toolIds.map((tool_id) => ({ type: 'tool_call', tool_id })),
  errors: [],
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

describe('createForensicTrajectoryEvaluator', () => {
  const evaluator = createForensicTrajectoryEvaluator();

  // The three distractor rows carry output.criteria and a forbidden list, and deliberately no
  // tool_sequence — before this guardrail they scored null/'N/A' on every model, so 15 cells of a
  // weekly run measured nothing while still being listed as failing cells.
  const distractorExample: ForensicDatasetExample = {
    input: { question: "What's the weather in San Francisco today?" },
    output: {
      criteria: ['Does not query logs-endpoint.events.* indices for DFIR purposes'],
      forbidden_tool_sequence: ['platform.core.generate_esql', 'platform.core.execute_esql'],
    },
    metadata: { golden_id: 'ef-distractor-weather', row_type: 'distractor' },
  };

  const evaluateWith = async (
    toolIds: string[],
    expected: ForensicDatasetExample['output'],
    metadata: ForensicDatasetExample['metadata'] = { row_type: 'happy' }
  ) =>
    evaluator.evaluate({
      input: { question: 'q' },
      output: taskOutputWith(toolIds),
      expected,
      metadata,
    });

  it('scores 1 when no forbidden tool ran', async () => {
    const result = await evaluateWith(
      ['platform.core.sml_search', 'load_skill'],
      distractorExample.output,
      distractorExample.metadata
    );

    expect(result.score).toBe(1);
    expect(result.label).toBe('forbidden_tools_absent');
    expect(result.metadata?.usedForbiddenTools).toEqual([]);
  });

  it('scores 0 when a forbidden tool ran', async () => {
    const result = await evaluateWith(
      ['platform.core.sml_search', 'platform.core.execute_esql'],
      distractorExample.output,
      distractorExample.metadata
    );

    expect(result.score).toBe(0);
    expect(result.label).toBe('forbidden_tools_used');
    expect(result.metadata?.usedForbiddenTools).toEqual(['platform.core.execute_esql']);
    expect(result.explanation).toContain('platform.core.execute_esql');
  });

  it('scores 1 for a distractor that called no tools at all', async () => {
    const result = await evaluateWith([], distractorExample.output, distractorExample.metadata);

    expect(result.score).toBe(1);
    expect(result.label).toBe('forbidden_tools_absent');
  });

  it('never reports N/A on a row that declares a forbidden list', async () => {
    const result = await evaluateWith(
      ['platform.core.sml_search'],
      distractorExample.output,
      distractorExample.metadata
    );

    expect(result.label).not.toBe('N/A');
    expect(result.score).not.toBeNull();
  });

  it('ignores skill-routing tools when checking the guardrail', async () => {
    const result = await evaluateWith(
      ['filestore.read', 'load_skill'],
      { ...distractorExample.output, forbidden_tool_sequence: ['filestore.read', 'load_skill'] },
      distractorExample.metadata
    );

    expect(result.score).toBe(1);
  });

  it('prefers the forbidden list when a row declares both', async () => {
    const result = await evaluateWith(['platform.core.execute_esql'], {
      criteria: [],
      tool_sequence: ['platform.core.generate_esql', 'platform.core.execute_esql'],
      forbidden_tool_sequence: ['platform.core.execute_esql'],
    });

    expect(result.score).toBe(0);
    expect(result.label).toBe('forbidden_tools_used');
  });

  it('still reports N/A when a row declares neither annotation', async () => {
    const result = await evaluateWith(['platform.core.sml_search'], { criteria: [] });

    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('keeps scoring golden-path rows against their tool_sequence', async () => {
    const matched = await evaluateWith(
      ['platform.core.generate_esql', 'platform.core.execute_esql'],
      { criteria: [], tool_sequence: ['platform.core.generate_esql', 'platform.core.execute_esql'] }
    );
    expect(matched.score).toBe(1);
    expect(matched.label).toBe('good');

    const missed = await evaluateWith(['platform.core.sml_search'], {
      criteria: [],
      tool_sequence: ['platform.core.generate_esql', 'platform.core.execute_esql'],
    });
    expect(missed.score).toBe(0);
    expect(missed.label).toBe('poor');
  });
});
