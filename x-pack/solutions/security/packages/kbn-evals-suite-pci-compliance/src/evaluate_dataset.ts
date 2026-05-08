/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client as EsClient } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  EvalsExecutorClient,
  Example,
} from '@kbn/evals';
import { createSkillInvocationEvaluator } from '@kbn/evals';
import type { PciEvalChatClient } from './chat_client';

export interface PciDatasetExample extends Example {
  input: {
    question: string;
  };
  output: {
    criteria: string[];
  };
}

export type EvaluatePciDataset = (options: {
  dataset: {
    name: string;
    description: string;
    examples: PciDatasetExample[];
  };
}) => Promise<void>;

/**
 * Criteria baked into every PCI example. The PCI skill guarantees:
 *  - PCI DSS v4.0.1 is cited (or `4.0.1`) in the answer.
 *  - The QSA disclaimer is surfaced so the answer never reads as a compliance
 *    determination.
 *  - A `scopeClaim` describing the indices + time range actually evaluated is referenced,
 *    either verbatim or by paraphrase.
 *
 * Keeping these as shared criteria (vs. copy-pasting into every spec) prevents drift when
 * the contract evolves.
 */
export const BASELINE_PCI_CRITERIA = [
  'The response explicitly references PCI DSS v4.0.1 (or the string "4.0.1").',
  'The response includes a QSA / Qualified Security Assessor disclaimer — the agent does not claim the finding is a formal compliance determination.',
  'The response references a scope (evaluated indices and the time range) the tool actually used, rather than a vague "I checked everything".',
  'If the tool results include any esql or query fields, they must contain valid ES|QL syntax (e.g. starting with FROM, ROW, or SHOW) — not descriptive text labels that would cause an ES|QL parse error.',
];

export function createPciCriteriaEvaluator({
  evaluators,
  extraCriteria = [],
}: {
  evaluators: DefaultEvaluators;
  extraCriteria?: string[];
}): Evaluator {
  return {
    name: 'PCI Criteria',
    kind: 'LLM' as const,
    evaluate: async ({ expected, ...rest }) => {
      const exampleCriteria: string[] = (expected as PciDatasetExample['output'])?.criteria ?? [];
      const allCriteria = [...BASELINE_PCI_CRITERIA, ...extraCriteria, ...exampleCriteria];
      return evaluators.criteria(allCriteria).evaluate({ expected, ...rest });
    },
  };
}

export function createEvaluatePciDataset({
  evaluators,
  executorClient,
  chatClient,
  traceEsClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: PciEvalChatClient;
  traceEsClient: EsClient;
  log: ToolingLog;
}): EvaluatePciDataset {
  return async function evaluatePciDataset({
    dataset: { name, description, examples },
  }: {
    dataset: {
      name: string;
      description: string;
      examples: PciDatasetExample[];
    };
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await executorClient.runExperiment(
      {
        dataset,
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
      [
        createPciCriteriaEvaluator({ evaluators }),
        createSkillInvocationEvaluator({
          traceEsClient,
          log,
          skillName: 'pci-compliance',
        }),
      ]
    );
  };
}
