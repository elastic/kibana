/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, KibanaRequest, ElasticsearchClient } from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import { RuleCreationAnnotation } from '../../state';
import { generateEsqlQueryNode } from './nodes/generate_esql_query';

export interface GetEsqlQueryGraphWithToolParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  events?: ToolEventEmitter;
}

export const getEsqlQueryGraphWithTool = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  model,
  events,
}: GetEsqlQueryGraphWithToolParams) => {
  const esqlQueryGraph = new StateGraph(RuleCreationAnnotation)
    .addNode(
      'generateEsqlQuery',
      await generateEsqlQueryNode({
        model,
        esClient,
        connectorId,
        inference,
        logger,
        request,
        events,
      })
    )
    .addEdge(START, 'generateEsqlQuery')
    .addEdge('generateEsqlQuery', END);

  const graph = esqlQueryGraph.compile();
  graph.name = 'ESQL Query Creation Graph (with agent_builder tool)';
  return graph;
};
