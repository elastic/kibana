/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import { isValidTraceId } from '@opentelemetry/api';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
  withEvaluatorSpan,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type TaskOutput,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  PersonaMatrixExample,
  PersonaMatrixExampleInput,
} from './datasets/persona_matrix_prompts';
import type { PersonaMatrixChatClient } from './chat_client';

/**
 * Dataset-level expected output the framework evaluators read via `expected`.
 * `reference` is the ground-truth answer for qualitative scoring; `expected`
 * is the field `correctness/index.ts` reads (`expected?.expected`) — we
 * persist both so a single dataset row drives correctness/groundedness
 * scoring. `tool_sequence` is copied from `metadata.expectedTools` so the
 * trajectory evaluator's `goldenPathExtractor` — which only receives
 * `expected`, not `metadata` — can see the golden path. Mirrors
 * `AlertsRagDatasetExpected` in `kbn-evals-suite-alerts-rag/src/evaluate_dataset.ts`.
 */
export interface PersonaMatrixDatasetExpected {
  reference: string;
  expected: string;
  tool_sequence?: string[];
}

export type PersonaMatrixDatasetExample = PersonaMatrixExample & {
  output: PersonaMatrixDatasetExpected;
};

/**
 * Maps a raw persona-matrix example into the shape the framework evaluators
 * expect: mirrors `output.reference` into `output.expected`, and copies
 * `metadata.expectedTools` into `output.tool_sequence` so
 * `goldenPathExtractor` can resolve the golden path from `expected` without
 * `@kbn/evals`'s `createTrajectoryEvaluator` needing access to `metadata`.
 * One mapping function instead of per-example duplication — cannot drift.
 */
export const toDatasetExample = (ex: PersonaMatrixExample): PersonaMatrixDatasetExample => {
  const expectedTools = ex.metadata?.expectedTools;
  return {
    ...ex,
    output: {
      reference: ex.output.reference,
      expected: ex.output.reference,
      ...(expectedTools?.length ? { tool_sequence: expectedTools } : {}),
    },
  };
};

/**
 * ExpectedToolCalled — verifies the primary expected tool was invoked.
 * Reads `expectedTools` from example metadata (first entry) or `tool_sequence`
 * from the expected output.
 */
export const createPersonaMatrixExpectedToolCalledEvaluator = (): Evaluator => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, expected, metadata }) => {
    // Try tool_sequence from expected output first, then expectedTools from metadata
    const toolSequence = (expected as PersonaMatrixDatasetExpected | undefined)?.tool_sequence;
    const meta = metadata as { expectedTools?: string[] } | undefined;
    const expectedTools = meta?.expectedTools ?? toolSequence;

    if (!expectedTools?.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedTools annotation — skipping ExpectedToolCalled.',
      };
    }

    const expectedToolId = expectedTools[0];
    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((step) => step.tool_id)
      .filter((id): id is string => Boolean(id));

    return {
      score: usedToolIds.includes(expectedToolId) ? 1 : 0,
      metadata: { expectedToolId, usedToolIds },
    };
  },
});

/**
 * Trajectory evaluator wrapper. Returns N/A when an example has no
 * `tool_sequence` annotation so partial-coverage datasets don't get
 * penalised. Mirrors `createAlertsRagTrajectoryEvaluator` in
 * `kbn-evals-suite-alerts-rag/src/evaluate_dataset.ts`. `filestore.read`
 * (SKILL.md activation) is stripped from the actual sequence since it's
 * already covered by the SkillInvoked evaluator and would otherwise show
 * up as a noisy "extra tool".
 */
const FILESTORE_READ_TOOL_ID = 'filestore.read';

export const createPersonaMatrixTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as PersonaMatrixDatasetExpected | undefined;
      return exp?.tool_sequence ?? [];
    },
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as PersonaMatrixDatasetExpected | undefined;
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

/**
 * SkillInvoked — verifies the agent loaded an acceptable skill for THIS example.
 *
 * Scored per-example from the example's own metadata, not fanned out across the
 * whole dataset: an `alert-analysis` prompt must not be scored against the
 * `workflow-authoring` assertion. `expectedSkill` and `allowSkills` are a union
 * — loading any one of them passes. Examples with no `expectedSkill` are N/A
 * (score `null`), which is the correct shape for prompts whose documented
 * contract is a direct tool call with no skill load.
 */
const VALID_SKILL_NAME = /^[a-zA-Z0-9_-]+$/;

export const createPersonaMatrixSkillInvokedEvaluator = ({
  traceEsClient,
  log,
}: {
  traceEsClient: EsClient;
  log: ToolingLog;
}): Evaluator => ({
  name: 'SkillInvoked',
  kind: 'CODE',
  evaluate: async ({ output, metadata }) => {
    const meta = metadata as { expectedSkill?: string; allowSkills?: string[] } | undefined;
    const acceptedSkills = [meta?.expectedSkill, ...(meta?.allowSkills ?? [])].filter(
      (s): s is string => typeof s === 'string' && s.length > 0
    );

    if (!acceptedSkills.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No expectedSkill/allowSkills annotation — skipping SkillInvoked.',
      };
    }

    const invalid = acceptedSkills.filter((s) => !VALID_SKILL_NAME.test(s));
    if (invalid.length) {
      return {
        score: null,
        label: 'error',
        explanation: `Invalid skill name(s): ${invalid.join(', ')}`,
      };
    }

    const traceId = (output as { traceId?: string } | undefined)?.traceId;
    if (!traceId || !isValidTraceId(traceId)) {
      return {
        score: null,
        label: 'unavailable',
        explanation: `No usable traceId for SkillInvoked (traceId: ${traceId ?? 'none'})`,
      };
    }

    const skillPredicate = acceptedSkills
      .map((skillName) => `attributes.gen_ai.tool.call.arguments LIKE "*/${skillName}/SKILL.md*"`)
      .join(' OR ');

    const query = `FROM traces-*
| WHERE trace.id == "${traceId}"
| STATS
  total_tool_spans = COUNT(
    CASE(attributes.elastic.inference.span.kind == "TOOL", 1, NULL)
  ),
  skill_invoked = COUNT(
    CASE(
      attributes.gen_ai.tool.name == "filestore.read" AND (${skillPredicate}),
      1,
      NULL
    )
  )`;

    try {
      const response = (await traceEsClient.esql.query({ query })) as unknown as {
        columns: Array<{ name: string }>;
        values: unknown[][];
      };
      const row = response.values?.[0];
      const idx = (name: string) => response.columns?.findIndex((c) => c.name === name) ?? -1;
      const toolSpansIdx = idx('total_tool_spans');
      const invokedIdx = idx('skill_invoked');

      if (!row || toolSpansIdx === -1 || invokedIdx === -1) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'Expected columns not found in trace query response',
        };
      }

      // No tool spans at all means the trace is not yet searchable, not that the
      // skill was skipped — scoring 0 here would be a false failure.
      if (!(row[toolSpansIdx] as number | undefined)) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No tool spans found for trace — trace data likely incomplete',
        };
      }

      const invoked = ((row[invokedIdx] as number | undefined) ?? 0) > 0;
      return { score: invoked ? 1 : 0, metadata: { acceptedSkills, invoked } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.warning(`SkillInvoked failed for trace ${traceId}: ${message}`);
      return { score: null, label: 'error', explanation: `SkillInvoked query failed: ${message}` };
    }
  },
});

export function createEvaluatePersonaMatrixDataset({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: PersonaMatrixChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}) {
  return async function evaluateDataset({
    dataset,
  }: {
    dataset: EvaluationDataset<PersonaMatrixExample>;
  }): Promise<void> {
    const wrappedExamples = dataset.examples.map(toDatasetExample);

    const skillInvokedEvaluator = createPersonaMatrixSkillInvokedEvaluator({
      traceEsClient,
      log,
    });

    const trajectoryEvaluator = createPersonaMatrixTrajectoryEvaluator();
    const expectedToolCalledEvaluator = createPersonaMatrixExpectedToolCalledEvaluator();

    const { inputTokens, outputTokens, toolCalls, latency } = evaluators.traceBasedEvaluators;

    // Quantitative correctness/groundedness evaluators are pure functions of
    // the precomputed analyses attached to task output below — no LLM calls
    // at evaluate time. Mirrors `buildAlertsRagEvaluators`.
    const allEvaluators: Evaluator[] = [
      skillInvokedEvaluator,
      trajectoryEvaluator,
      expectedToolCalledEvaluator,
      ...createQuantitativeCorrectnessEvaluators(),
      createQuantitativeGroundednessEvaluator(),
      evaluators.criteria([
        'Relevance: The response directly addresses the user security question.',
        'Clarity: The response is well-structured and easy to follow.',
        'Accuracy: Security concepts and recommendations are technically correct.',
        'Completeness: The response covers the key aspects of the question.',
      ]),
      inputTokens,
      outputTokens,
      toolCalls,
      latency,
    ];

    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: dataset.name,
            description: dataset.description,
            examples: wrappedExamples,
          },
        ],
        metadata: { suite: 'security-persona-matrix', source: 'persona-matrix-eval' },
        task: async (example) => {
          const input = example.input as PersonaMatrixExampleInput;
          const question = input?.question;
          if (!question) throw new Error('Missing question in example input');
          const response = await chatClient.query(question, input?.attachment);

          const taskOutput: TaskOutput = {
            messages: response.messages,
            steps: response.steps,
            errors: response.errors,
            traceId: response.traceId ?? null,
          };

          // Precompute the qualitative analyses inside the task once, so the
          // deterministic Factuality/Relevance/Sequence Accuracy/Groundedness
          // evaluators registered above are pure functions of the precomputed
          // result and correctnessAnalysis() is invoked exactly once per
          // example (was: once here + once again as a registered evaluator).
          const expected = example.output as PersonaMatrixDatasetExpected;
          const [correctnessResult, groundednessResult] = await Promise.all([
            withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
              evaluators.correctnessAnalysis().evaluate({
                input,
                expected,
                output: taskOutput,
                metadata: example.metadata,
              })
            ),
            withEvaluatorSpan('GroundednessAnalysis', {}, () =>
              evaluators.groundednessAnalysis().evaluate({
                input,
                expected,
                output: taskOutput,
                metadata: example.metadata,
              })
            ),
          ]);

          return {
            ...(taskOutput as object),
            correctnessAnalysis: correctnessResult?.metadata,
            groundednessAnalysis: groundednessResult?.metadata,
          } as TaskOutput;
        },
      },
      allEvaluators
    );

    log.info('[persona-matrix] dataset evaluation complete');
  };
}
