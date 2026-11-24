/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  selectEvaluators,
  type DefaultEvaluators,
  type EvaluationDataset,
  type EvalsExecutorClient,
  type Example,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { HttpHandler } from '@kbn/core/public';
import { callConverse } from './converse_task';

export interface ConverseEvalExample extends Example {
  input: { question: string };
  output: { expected: string };
  metadata?: {
    attachments?: Array<{ type: string; data?: unknown }>;
    expectedAttachmentReads?: number;
    /** When set, the exact skill set for the run (built-in Elastic skills are turned off). */
    skillIds?: string[];
    /** When set, passed to converse as configuration_overrides.tools. */
    toolIds?: string[];
  };
}

type ExtraEvaluators = Parameters<typeof selectEvaluators>[0];

/**
 * Runs a dataset through the Agent Builder /converse endpoint, and scores it with the criteria,
 * the given extra evaluators and the trace-based evaluators.
 */
export const createEvaluateConverse = ({
  fetch,
  connector,
  evaluators,
  executorClient,
  log,
  extraEvaluators,
}: {
  fetch: HttpHandler;
  connector: { id: string };
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  log: ToolingLog;
  extraEvaluators: ExtraEvaluators;
}) => {
  return async ({
    dataset,
    criteria,
  }: {
    dataset: { name: string; description: string; examples: ConverseEvalExample[] };
    criteria: string[];
  }) => {
    const selectedEvaluators = selectEvaluators([
      evaluators.criteria(criteria),
      ...extraEvaluators,
      ...Object.values(evaluators.traceBasedEvaluators),
    ]);

    await executorClient.runExperiment(
      {
        datasets: [
          {
            name: dataset.name,
            description: dataset.description,
            examples: dataset.examples,
          } satisfies EvaluationDataset,
        ],
        task: async ({ input, metadata }) => {
          const { attachments = [], skillIds, toolIds } = metadata ?? {};
          return callConverse({
            fetch,
            connectorId: connector.id,
            question: input.question,
            attachments,
            log,
            // skill_ids only pins the skill set when built-in skills are off.
            configurationOverrides:
              skillIds !== undefined || toolIds !== undefined
                ? {
                    ...(skillIds !== undefined
                      ? { skill_ids: skillIds, enable_elastic_capabilities: false }
                      : {}),
                    ...(toolIds !== undefined ? { tools: [{ tool_ids: toolIds }] } : {}),
                  }
                : undefined,
          });
        },
      },
      selectedEvaluators
    );
  };
};
