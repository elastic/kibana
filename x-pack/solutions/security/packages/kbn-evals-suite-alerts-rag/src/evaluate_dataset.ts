/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import {
  createQuantitativeCorrectnessEvaluators,
  createQuantitativeGroundednessEvaluator,
  createSkillInvocationEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
  type DefaultEvaluators,
  type EvalsExecutorClient,
  type EvaluationDataset,
  type Evaluator,
  type Example,
  type ExperimentTask,
  type TaskOutput,
  withEvaluatorSpan,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { AlertsRagCategory, AlertsRagExample } from './dataset';
import type { AlertsRagAgentBuilderChatClient } from './chat_client';

/**
 * Canonical agent-builder skill the alerts-rag agent should activate when
 * answering questions about open alerts. Defined in
 * `x-pack/solutions/security/plugins/security_solution/server/agent_builder/skills/alert_analysis/alert_analysis_skill.ts`
 * with `id: 'alert-analysis'`, `basePath: 'skills/security/alerts'`, which
 * resolves to `skills/security/alerts/alert-analysis/SKILL.md`. The
 * trace-based skill-invocation evaluator detects the corresponding
 * `filestore.read` span in the conversation trace.
 */
const ALERTS_RAG_SKILL_NAME = 'alert-analysis';

/**
 * Wrapped input type for the kbn-evals framework. Must extend
 * `Record<string, unknown>` to satisfy the `Example<TInput>` constraint.
 */
export interface AlertsRagDatasetInput extends Record<string, unknown> {
  question: string;
}

/**
 * Dataset-level expected output. `reference` is the ground-truth answer used
 * by qualitative scoring; `expected` is the field the framework's
 * `correctnessAnalysis` evaluator reads (it consumes `expected.expected`).
 * We persist both so a single dataset row drives correctness and
 * groundedness scoring.
 */
export interface AlertsRagDatasetExpected {
  reference: string;
  expected: string;
  /**
   * Optional golden tool sequence, forwarded from {@link AlertsRagExample}.
   * Consumed by the trajectory evaluator; examples without an annotation
   * skip trajectory scoring (the evaluator reports N/A so unannotated
   * examples don't dilute the suite's averages).
   */
  tool_sequence?: string[];
}

export interface AlertsRagDatasetMetadata extends Record<string, unknown> {
  category: AlertsRagCategory;
  dataset_split: string[];
}

export type AlertsRagDatasetExample = Example<
  AlertsRagDatasetInput,
  AlertsRagDatasetExpected,
  AlertsRagDatasetMetadata
>;

export const toDatasetExample = (ex: AlertsRagExample): AlertsRagDatasetExample => ({
  input: { question: ex.input },
  output: {
    reference: ex.expected.reference,
    expected: ex.expected.reference,
    ...(ex.expected.tool_sequence ? { tool_sequence: ex.expected.tool_sequence } : {}),
  },
  metadata: {
    category: ex.metadata.category,
    dataset_split: ex.metadata.dataset_split,
  },
});

/**
 * Spans for `filestore.read` (SKILL.md activation, attachment loads) are
 * already covered by the skill-invocation evaluator and add noise to the
 * trajectory report's "extra tools" list, so we strip them from the actual
 * sequence before scoring. The trajectory evaluator's LCS already tolerates
 * extras without lowering the score, but a clean per-example metadata blob
 * makes the eventual report easier to read.
 */
const FILESTORE_READ_TOOL_ID = 'filestore.read';

/**
 * Trajectory evaluator wrapper. Returns N/A when an example has no
 * `tool_sequence` annotation so partial-coverage datasets don't get
 * penalised. Mirrors the N/A-on-missing-golden pattern used by the
 * workflows eval suite (`createToolTrajectoryEvaluator`).
 */
export const createAlertsRagTrajectoryEvaluator = (): Evaluator<
  AlertsRagDatasetExample,
  TaskOutput
> => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as AlertsRagDatasetExpected | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as AlertsRagDatasetExpected | undefined;
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  } as Evaluator<AlertsRagDatasetExample, TaskOutput>;
};

export type EvaluateAlertsRagDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: AlertsRagExample[];
  };
}) => Promise<void>;

/**
 * The evaluator set is load-bearing for the suite's regression story: each
 * name in this list corresponds to a column in the Buildkite eval report. A
 * silent drop or rename would skip regression coverage without changing the
 * suite's exit code, so the set is pinned in `evaluate_dataset.test.ts`.
 *
 * Three tiers:
 *  1. Quality (LLM-judged): Factuality, Relevance, Sequence Accuracy, Groundedness.
 *     These read the precomputed correctness/groundedness analyses attached
 *     by the task function.
 *  2. Observability (trace-based, zero per-example cost): Tool Calls,
 *     Latency, Input/Output/Cached Tokens, Skill Invoked. These read OTel
 *     spans from `traces-*` for the conversation's trace.id and set a
 *     baseline we can track over time without paying for additional LLM
 *     judging.
 *  3. Trajectory (code-judged, zero per-example cost): scores the agent's
 *     tool-call sequence against a per-example `tool_sequence` annotation
 *     using LCS (order) + set intersection (coverage). Examples without an
 *     annotation report N/A so they don't pull averages down.
 */
export const buildAlertsRagEvaluators = ({
  evaluators,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  traceEsClient: EsClient;
  log: ToolingLog;
}): Array<Evaluator<AlertsRagDatasetExample, TaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    ...(createQuantitativeCorrectnessEvaluators() as Array<
      Evaluator<AlertsRagDatasetExample, TaskOutput>
    >),
    createQuantitativeGroundednessEvaluator() as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    toolCalls as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    latency as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    inputTokens as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    outputTokens as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    createSkillInvocationEvaluator({
      traceEsClient,
      log,
      skillName: ALERTS_RAG_SKILL_NAME,
    }) as Evaluator<AlertsRagDatasetExample, TaskOutput>,
    createAlertsRagTrajectoryEvaluator(),
  ];
};

const buildTask = ({
  chatClient,
  evaluators,
  log,
}: {
  chatClient: AlertsRagAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  log: ToolingLog;
}): ExperimentTask<AlertsRagDatasetExample, TaskOutput> => {
  return async (example) => {
    const { input, output: expected, metadata } = example;
    const question = input?.question ?? '';
    const questionPreview = `${question.slice(0, 120)}${question.length > 120 ? '...' : ''}`;
    log.info(`[alerts-rag] task request: question="${questionPreview}"`);

    const response = await chatClient.converse({ message: question });

    // The framework's analysis evaluators read `output.messages[length-1]`
    // and `output.steps`. `converse` returns the same shape.
    const taskOutput = {
      messages: response.messages,
      steps: response.steps,
      errors: response.errors,
      traceId: response.traceId,
    };

    // Precompute the qualitative analyses inside the task so the deterministic
    // Factuality / Relevance / Sequence Accuracy / Groundedness evaluators
    // downstream are pure functions of the precomputed analyses (mirrors the
    // pattern in `@kbn/evals-suite-agent-builder`).
    const [correctnessResult, groundednessResult] = await Promise.all([
      withEvaluatorSpan('CorrectnessAnalysis', {}, () =>
        evaluators.correctnessAnalysis().evaluate({
          input,
          expected,
          output: taskOutput,
          metadata,
        })
      ),
      withEvaluatorSpan('GroundednessAnalysis', {}, () =>
        evaluators.groundednessAnalysis().evaluate({
          input,
          expected,
          output: taskOutput,
          metadata,
        })
      ),
    ]);

    return {
      ...taskOutput,
      correctnessAnalysis: correctnessResult?.metadata,
      groundednessAnalysis: groundednessResult?.metadata,
    };
  };
};

export const createEvaluateAlertsRagDataset = ({
  chatClient,
  evaluators,
  executorClient,
  traceEsClient,
  log,
}: {
  chatClient: AlertsRagAgentBuilderChatClient;
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluateAlertsRagDataset => {
  return async ({ dataset: { name, description, examples } }) => {
    const wrappedExamples = examples.map(toDatasetExample);

    const dataset = {
      name,
      description,
      examples: wrappedExamples,
    } satisfies EvaluationDataset<AlertsRagDatasetExample>;

    const evalStack = buildAlertsRagEvaluators({ evaluators, traceEsClient, log });
    const task = buildTask({ chatClient, evaluators, log });

    await executorClient.runExperiment({ dataset, task }, evalStack);
  };
};
