/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { migrateWorkflowConfigSchema, migrateWorkflowState } from './state';
import type { MigrateWorkflowGraphParams } from './types';
import { getPrepareStoryNode } from './nodes/prepare_story';
import { getMapWithMapperNode } from './nodes/map_with_mapper';
import { getEnhanceWithLlmNode } from './nodes/enhance_with_llm';
import { getFinalizeNode } from './nodes/finalize';

export function getWorkflowMigrationAgent(params: MigrateWorkflowGraphParams) {
  const prepareStoryNode = getPrepareStoryNode();
  const mapWithMapperNode = getMapWithMapperNode();
  const enhanceWithLlmNode = getEnhanceWithLlmNode({ model: params.model });
  const finalizeNode = getFinalizeNode();

  const graph = new StateGraph(migrateWorkflowState, migrateWorkflowConfigSchema)
    .addNode('prepareStory', prepareStoryNode)
    .addNode('mapWithMapper', mapWithMapperNode)
    .addNode('enhanceWithLlm', enhanceWithLlmNode)
    .addNode('finalize', finalizeNode)
    .addEdge(START, 'prepareStory')
    .addEdge('prepareStory', 'mapWithMapper')
    .addEdge('mapWithMapper', 'enhanceWithLlm')
    .addEdge('enhanceWithLlm', 'finalize')
    .addEdge('finalize', END)
    .compile();

  graph.name = 'Workflow Migration Graph';
  return graph;
}
