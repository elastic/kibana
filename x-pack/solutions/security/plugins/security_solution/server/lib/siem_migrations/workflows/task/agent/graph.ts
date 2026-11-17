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
import { BLOCK_TRANSLATION_TITLE, FAIL_TRANSLATION_TITLE } from './constants';
import type {
  MigrateWorkflowConfigSchema,
  WorkflowMigrationAgent,
  WorkflowMigrationTaskInput,
  WorkflowMigrationTaskOutput,
} from './types';

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

const waitForAbort = (signal: AbortSignal | undefined): Promise<never> =>
  new Promise((_, reject) => {
    if (!signal) {
      reject(new Error('Missing abort signal'));
      return;
    }
    const fail = () => reject(new AbortError());
    if (signal.aborted) {
      fail();
      return;
    }
    signal.addEventListener('abort', fail, { once: true });
  });

/**
 * Placeholder translation graph. It records the selected model name and does not call the model.
 * `block-translation` and `fail-translation` titles exist so stop and retry can be tested without an LLM.
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
    if (input.original_workflow.title === BLOCK_TRANSLATION_TITLE) {
      await waitForAbort(config?.signal);
    }
    if (input.original_workflow.title === FAIL_TRANSLATION_TITLE) {
      throw new Error('Dummy translation failed');
    }

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
