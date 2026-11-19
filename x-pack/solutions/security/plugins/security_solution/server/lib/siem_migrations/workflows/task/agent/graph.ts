/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunnableConfig } from '@langchain/core/runnables';
import { AbortError } from '@kbn/kibana-utils-plugin/server';
import { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import { generateAssistantComment } from '../../../common/task/util/comments';
import * as placeholderNode from './nodes/placeholder';
import type {
  MigrateWorkflowConfigSchema,
  WorkflowMigrationAgent,
  WorkflowMigrationTaskInput,
  WorkflowMigrationTaskOutput,
} from './types';

/** How long the placeholder waits so a stop request can abort it. */
export const PLACEHOLDER_TRANSLATION_DELAY_MS = 3_000;

const quoteYaml = (value: string): string => JSON.stringify(value);

/** Minimal Workflow YAML stored until the real Tines translation graph replaces this function. */
const buildPlaceholderWorkflowYaml = (title: string): string =>
  [
    'version: "1"',
    `name: ${quoteYaml(title)}`,
    'description: "Placeholder translation. The Tines translation graph is not implemented yet."',
    'enabled: false',
    'triggers:',
    '  - type: manual',
    'steps:',
    '  - name: placeholder',
    '    type: console',
    '    with:',
    `      message: ${quoteYaml(`Placeholder translation for ${title}`)}`,
  ].join('\n');

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AbortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AbortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });

/**
 * Placeholder translation graph. It records the selected model name and does not call the model.
 */
export const getWorkflowMigrationAgent = ({
  modelName,
}: {
  modelName?: string;
}): WorkflowMigrationAgent => ({
  invoke: async (
    input: WorkflowMigrationTaskInput,
    config?: RunnableConfig<MigrateWorkflowConfigSchema>
  ): Promise<WorkflowMigrationTaskOutput> => {
    await placeholderNode.placeholderNoOpNode();
    await sleep(PLACEHOLDER_TRANSLATION_DELAY_MS, config?.signal);

    const modelLabel =
      modelName && modelName.length > 0 ? modelName : 'the connector default model';
    return {
      elastic_workflow: {
        title: input.original_workflow.title,
        ...(input.original_workflow.description
          ? { description: input.original_workflow.description }
          : {}),
        yaml: buildPlaceholderWorkflowYaml(input.original_workflow.title),
      },
      translation_result: MigrationTranslationResult.FULL,
      comments: [
        generateAssistantComment(
          `Placeholder translation using ${modelLabel}. The Tines translation graph is not implemented yet.`
        ),
      ],
    };
  },
});
