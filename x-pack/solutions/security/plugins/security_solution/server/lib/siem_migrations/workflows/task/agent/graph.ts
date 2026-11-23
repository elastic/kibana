/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { MigrationTranslationResult } from '../../../../../../common/siem_migrations/constants';
import { generateAssistantComment } from '../../../common/task/util/comments';
import * as placeholderNode from './nodes/placeholder';
import { migrateWorkflowState } from './state';
import type { MigrateWorkflowState } from './types';

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

const getPlaceholderTranslationNode =
  (modelName?: string) =>
  async (state: MigrateWorkflowState): Promise<Partial<MigrateWorkflowState>> => {
    await placeholderNode.placeholderNoOpNode();

    const modelLabel =
      modelName && modelName.length > 0 ? modelName : 'the connector default model';
    return {
      elastic_workflow: {
        title: state.original_workflow.title,
        ...(state.original_workflow.description
          ? { description: state.original_workflow.description }
          : {}),
        yaml: buildPlaceholderWorkflowYaml(state.original_workflow.title),
      },
      translation_result: MigrationTranslationResult.FULL,
      comments: [
        generateAssistantComment(
          `Placeholder translation using ${modelLabel}. The Tines translation graph is not implemented yet.`
        ),
      ],
    };
  };

/**
 * Placeholder translation graph. It records the selected model name and does not call the model.
 */
export const getWorkflowMigrationAgent = ({ modelName }: { modelName?: string }) => {
  const graph = new StateGraph(migrateWorkflowState)
    .addNode('placeholderTranslation', getPlaceholderTranslationNode(modelName))
    .addEdge(START, 'placeholderTranslation')
    .addEdge('placeholderTranslation', END)
    .compile();
  graph.name = 'Workflow Migration Graph';
  return graph;
};
