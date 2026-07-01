/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
  TaskOutput,
} from '@kbn/evals';
import {
  createSkillInvocationEvaluator,
  createTrajectoryEvaluator,
  getToolCallSteps,
} from '@kbn/evals';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SiemReadinessEvalChatClient } from './chat_client';

export interface SiemReadinessDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
    /**
     * Optional golden tool order for L2 trajectory / L4 ExpectedToolCalled.
     * When omitted, both evaluators report N/A so the example doesn't dilute
     * the suite's averages.
     */
    tool_sequence?: string[];
  };
}

const FILESTORE_READ_TOOL_ID = 'filestore.read';

export type EvaluateSiemReadinessDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: SiemReadinessDatasetExample[];
  };
}) => Promise<void>;

/**
 * Criteria baked into every SIEM Readiness example. The SIEM Readiness skill guarantees:
 *  - A Status section showing overall health (healthy / actionsRequired / noData).
 *  - A Summary section with 1–2 sentences covering what's healthy and what needs attention.
 *  - A Findings section organized by dimension (Coverage, Quality, Continuity, Retention).
 *  - All actionable findings include blast-radius sub-bullets (Affected Platform, Affected Rules, Affected Tactics).
 *  - A Suggested Actions section with concrete next steps when there are findings.
 *  - No fabricated findings for dimensions or categories that have no issues.
 *
 * Keeping these as shared criteria (vs. copy-pasting into every spec) prevents drift when
 * the contract evolves.
 */
export const BASELINE_SIEM_READINESS_CRITERIA = [
  'The response includes a Status section showing overall health (healthy / actionsRequired / noData).',
  "The response includes a Summary section with 1–2 sentences covering what's healthy and what needs attention.",
  'The response includes a Findings section organized by dimension (Coverage, Quality, Continuity, Retention). Only dimensions with findings are shown.',
  'For every actionable finding shown, the response includes all three blast-radius sub-bullets: Affected Platform, Affected Rules, and Affected Tactics.',
  'The response includes a Suggested Actions section with concrete next steps when there are findings.',
  'The response does not fabricate findings for dimensions or categories that have no issues.',
];

export function createSiemReadinessCriteriaEvaluator({
  evaluators,
  extraCriteria = [],
}: {
  evaluators: DefaultEvaluators;
  extraCriteria?: string[];
}): Evaluator {
  return {
    name: 'SIEM Readiness Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ expected, ...rest }) => {
      const exampleCriteria: string[] =
        (expected as SiemReadinessDatasetExample['output'])?.criteria ?? [];
      const allCriteria = [
        ...BASELINE_SIEM_READINESS_CRITERIA,
        ...extraCriteria,
        ...exampleCriteria,
      ];
      return evaluators.criteria(allCriteria).evaluate({ expected, ...rest });
    },
  };
}

/**
 * L2 (Tool Trajectory) signal — code-judged, zero LLM cost. Returns N/A when an
 * example has no `tool_sequence` annotation so partial-coverage datasets don't
 * get penalised. Mirrors the alerts-rag / endpoint pattern.
 */
export function createSiemReadinessTrajectoryEvaluator(): Evaluator<
  SiemReadinessDatasetExample,
  TaskOutput
> {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) =>
      getToolCallSteps(output as TaskOutput)
        .map((step) => step.tool_id)
        .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID),
    goldenPathExtractor: (expected) => {
      const exp = expected as SiemReadinessDatasetExample['output'] | undefined;
      return exp?.tool_sequence ?? [];
    },
    orderWeight: 0.6,
    coverageWeight: 0.4,
  });

  return {
    ...inner,
    name: 'Trajectory',
    evaluate: async (args) => {
      const exp = args.expected as SiemReadinessDatasetExample['output'] | undefined;
      if (!exp?.tool_sequence || exp.tool_sequence.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No tool_sequence annotation — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  } as Evaluator<SiemReadinessDatasetExample, TaskOutput>;
}

/**
 * L4 (Tool Selection) signal — code-judged, zero LLM cost. Returns N/A when an
 * example has no `tool_sequence` annotation. Scores 1 if the first tool in the
 * golden sequence was called, 0 otherwise. Full-order alignment is covered by
 * the Trajectory evaluator (L2).
 */
export const createSiemReadinessExpectedToolCalledEvaluator = (): Evaluator<
  SiemReadinessDatasetExample,
  TaskOutput
> => ({
  name: 'ExpectedToolCalled',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const exp = expected as SiemReadinessDatasetExample['output'] | undefined;
    const toolSequence = exp?.tool_sequence;
    if (!toolSequence?.length) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No tool_sequence annotation — skipping ExpectedToolCalled.',
      };
    }

    const expectedToolId = toolSequence[0];
    const usedToolIds = getToolCallSteps(output as TaskOutput)
      .map((step) => step.tool_id)
      .filter((id): id is string => Boolean(id) && id !== FILESTORE_READ_TOOL_ID);

    return {
      score: usedToolIds.includes(expectedToolId) ? 1 : 0,
      metadata: { expectedToolId, usedToolIds },
    };
  },
});

export function createEvaluateSiemReadinessDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SiemReadinessEvalChatClient;
  traceEsClient?: Client;
  log?: ToolingLog;
}): EvaluateSiemReadinessDataset {
  return async function evaluateSiemReadinessDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: SiemReadinessDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
      evaluators.traceBasedEvaluators;

    const baseEvaluators: Evaluator<SiemReadinessDatasetExample, TaskOutput>[] = [
      createSiemReadinessCriteriaEvaluator({ evaluators }),
      createSiemReadinessTrajectoryEvaluator(),
      createSiemReadinessExpectedToolCalledEvaluator(),
      toolCalls as Evaluator<SiemReadinessDatasetExample, TaskOutput>,
      latency as Evaluator<SiemReadinessDatasetExample, TaskOutput>,
      inputTokens as Evaluator<SiemReadinessDatasetExample, TaskOutput>,
      outputTokens as Evaluator<SiemReadinessDatasetExample, TaskOutput>,
      cachedTokens as Evaluator<SiemReadinessDatasetExample, TaskOutput>,
    ];

    if (traceEsClient && log) {
      baseEvaluators.push(
        createSkillInvocationEvaluator({
          skillName: 'siem-readiness',
          traceEsClient,
          log,
        }) as Evaluator<SiemReadinessDatasetExample, TaskOutput>
      );
    }

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input }) => {
          const response = await chatClient.converse({ message: input.question });

          return {
            messages: response.messages,
            steps: response.steps,
            errors: response.errors,
            traceId: response.traceId,
          };
        },
      },
      baseEvaluators
    );
  };
}
