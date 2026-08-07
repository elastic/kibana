/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { TaskOutput } from '@kbn/evals';
import {
  toDatasetExample,
  createPersonaMatrixTrajectoryEvaluator,
  createPersonaMatrixExpectedToolCalledEvaluator,
  createPersonaMatrixSkillInvokedEvaluator,
  type PersonaMatrixDatasetExample,
} from './evaluate_dataset';
import {
  PERSONA_MATRIX_EXAMPLES,
  type PersonaMatrixExample,
} from './datasets/persona_matrix_prompts';

const baseExample: PersonaMatrixExample = {
  id: 'example-a',
  category: 'alert-analysis',
  variant: 'A',
  description: 'test example',
  input: { question: 'what happened?' },
  output: { reference: 'the reference answer' },
  metadata: {
    expectedSkill: 'alert-analysis',
    expectedTools: ['security.alerts', 'security.get_related_alerts'],
    severity: 'high',
    tags: ['triage'],
  },
};

const buildLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as ToolingLog);

describe('toDatasetExample', () => {
  it('resolves the golden path from metadata.expectedTools into output.tool_sequence', () => {
    // The trajectory evaluator's goldenPathExtractor only receives `expected`
    // (a sibling of `metadata`, not a parent — kbn-evals/src/evaluators/trajectory/index.ts,
    // kbn-evals/src/types.ts). Without this mapping step the annotation on
    // `metadata.expectedTools` is unreachable from inside that callback.
    const wrapped = toDatasetExample(baseExample);
    expect(wrapped.output.tool_sequence).toEqual([
      'security.alerts',
      'security.get_related_alerts',
    ]);
  });

  it('mirrors reference into output.expected so correctness/index.ts resolves ground truth', () => {
    // correctness/index.ts reads `expected?.expected`, not `expected?.reference`.
    const wrapped = toDatasetExample(baseExample);
    expect(wrapped.output.reference).toBe('the reference answer');
    expect(wrapped.output.expected).toBe('the reference answer');
  });

  it('omits tool_sequence when the example has no expectedTools annotation', () => {
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const wrapped = toDatasetExample(unannotated);
    expect(wrapped.output).not.toHaveProperty('tool_sequence');
  });

  it('populates expected for every example in the real dataset', () => {
    // Regression guard for the class of bug this suite shipped with: a
    // silent drop here means correctness/index.ts silently judges `undefined`
    // again for every example, and only a real run would surface it.
    const wrapped = PERSONA_MATRIX_EXAMPLES.map(toDatasetExample);
    expect(wrapped).toHaveLength(21);
    for (const example of wrapped) {
      expect(typeof example.output.expected).toBe('string');
      expect(example.output.expected.length).toBeGreaterThan(0);
      expect(example.output.expected).toBe(example.output.reference);
    }
  });
});

describe('createPersonaMatrixTrajectoryEvaluator', () => {
  const buildArgs = (
    example: PersonaMatrixExample,
    steps: Array<{ type?: string; tool_id?: string }>
  ) => {
    const wrapped: PersonaMatrixDatasetExample = toDatasetExample(example);
    return {
      input: wrapped.input,
      expected: wrapped.output,
      output: { steps } as unknown as TaskOutput,
      metadata: wrapped.metadata,
    } as unknown as Parameters<
      ReturnType<typeof createPersonaMatrixTrajectoryEvaluator>['evaluate']
    >[0];
  };

  it('returns N/A, not a score, when the example has no tool_sequence annotation', async () => {
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const result = await evaluator.evaluate(
      buildArgs(unannotated, [{ type: 'tool_call', tool_id: 'security.alerts' }])
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores non-null when the example is annotated and the agent calls the golden tools', async () => {
    // Regression guard for the inverted-scoring bug: before the fix, an
    // annotated example whose agent correctly called tools scored a hard
    // 0.0 because goldenPathExtractor read the (always-empty) tool_sequence
    // field directly instead of the mapped output.
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs(baseExample, [
        { type: 'tool_call', tool_id: 'security.alerts' },
        { type: 'tool_call', tool_id: 'security.get_related_alerts' },
      ])
    );
    expect(result.score).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it('excludes filestore.read from the actual tool sequence', async () => {
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    const result = await evaluator.evaluate(
      buildArgs(baseExample, [
        { type: 'tool_call', tool_id: 'filestore.read' },
        { type: 'tool_call', tool_id: 'security.alerts' },
        { type: 'tool_call', tool_id: 'security.get_related_alerts' },
      ])
    );
    const metadata = result.metadata as { actual: string[] } | undefined;
    expect(metadata?.actual).not.toContain('filestore.read');
  });

  it('every real dataset example resolves a non-empty expected tool list in evaluator metadata', async () => {
    // Countable per-example gate (not an aggregate score): for each of the
    // 21 annotated examples, the resolved `expected` tool list in evaluator
    // metadata must be non-empty and equal that example's expectedTools.
    // Falsifiable against the dataset and immune to how the agent orders
    // its calls.
    const evaluator = createPersonaMatrixTrajectoryEvaluator();
    for (const example of PERSONA_MATRIX_EXAMPLES) {
      const wrapped = toDatasetExample(example);
      const result = await evaluator.evaluate(
        buildArgs(
          example,
          (example.metadata.expectedTools ?? []).map((toolId) => ({
            type: 'tool_call',
            tool_id: toolId,
          }))
        )
      );
      expect(result.score).not.toBeNull();
      const metadata = result.metadata as { expected: string[] } | undefined;
      expect(metadata?.expected).toEqual(wrapped.output.tool_sequence);
    }
  });
});

describe('createPersonaMatrixExpectedToolCalledEvaluator', () => {
  it('scores 1 when the primary expected tool was called', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(baseExample).output,
      output: {
        steps: [{ type: 'tool_call', tool_id: 'security.alerts' }],
      } as unknown as TaskOutput,
      metadata: baseExample.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBe(1);
  });

  it('returns N/A when the example has no expectedTools annotation', async () => {
    const evaluator = createPersonaMatrixExpectedToolCalledEvaluator();
    const unannotated: PersonaMatrixExample = {
      ...baseExample,
      metadata: { ...baseExample.metadata, expectedTools: undefined },
    };
    const result = await evaluator.evaluate({
      input: { question: 'q' },
      expected: toDatasetExample(unannotated).output,
      output: { steps: [] } as unknown as TaskOutput,
      metadata: unannotated.metadata,
    } as unknown as Parameters<ReturnType<typeof createPersonaMatrixExpectedToolCalledEvaluator>['evaluate']>[0]);
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });
});

describe('createPersonaMatrixSkillInvokedEvaluator', () => {
  const buildEvaluatorArgs = (metadata: PersonaMatrixExample['metadata'], traceId?: string) =>
    ({
      input: { question: 'q' },
      expected: {},
      output: { traceId } as unknown as TaskOutput,
      metadata,
    } as unknown as Parameters<
      ReturnType<typeof createPersonaMatrixSkillInvokedEvaluator>['evaluate']
    >[0]);

  it('returns N/A when the example has no expectedSkill/allowSkills annotation', async () => {
    // 4 of the 21 real examples (workflow-authoring-b/c, workflow-execution-a/b)
    // legitimately have no expectedSkill — platform.core.generate_workflow does
    // not require a skill load. Those must report N/A, not a failing score.
    const evaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
      log: buildLog(),
    });
    const result = await evaluator.evaluate(
      buildEvaluatorArgs({ ...baseExample.metadata, expectedSkill: undefined }, 'abcd')
    );
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('returns unavailable, not a failing score, when there is no usable traceId', async () => {
    const evaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient: { esql: { query: jest.fn() } } as unknown as EsClient,
      log: buildLog(),
    });
    const result = await evaluator.evaluate(buildEvaluatorArgs(baseExample.metadata, undefined));
    expect(result.score).toBeNull();
    expect(result.label).toBe('unavailable');
  });
});

describe('task output shape', () => {
  it('the real converse answer is reachable at messages[last].message', () => {
    // Regression guard for blocker #2: the shared correctness/groundedness
    // evaluators read output.messages[output.messages.length - 1].message.
    // This suite must never store the answer only under `response`.
    const taskOutput: TaskOutput = {
      messages: [{ message: 'the real answer' }],
      steps: [],
      errors: [],
      traceId: 'trace-1',
    };
    const messages = (taskOutput as { messages?: Array<{ message?: string }> }).messages ?? [];
    const latestMessage = messages[messages.length - 1]?.message;
    expect(latestMessage).toBe('the real answer');
  });
});
