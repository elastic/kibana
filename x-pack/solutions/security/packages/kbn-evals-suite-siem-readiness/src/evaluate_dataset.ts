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
import { createSkillInvocationEvaluator } from '@kbn/evals';
import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SiemReadinessEvalChatClient } from './chat_client';

export interface SiemReadinessDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
  };
}

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
