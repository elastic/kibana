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
import type { RuleCreationState } from '../../state';
import { RuleCreationAnnotation } from '../../state';
import { nlToEsqlQueryNode } from './nodes/nl_to_esql';
import { validateEsqlQueryNode } from './nodes/validate_esql_query';
import { fixEsqlQueryNode } from './nodes/fix_esql_query';

export interface GetEsqlQueryGraphParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
}

export const getEsqlQueryGraph = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
  model,
}: GetEsqlQueryGraphParams) => {
  const esqlQueryGraph = new StateGraph(RuleCreationAnnotation)
    .addNode(
      'createEsqlQuery',
      await nlToEsqlQueryNode({
        model,
        esClient,
        connectorId,
        inference,
        logger,
        request,
        createLlmInstance,
      })
    )
    .addNode('validateEsqlQuery', validateEsqlQueryNode({ logger, esClient }))
    .addNode(
      'fixEsqlQuery',
      await fixEsqlQueryNode({
        model,
        esClient,
        connectorId,
        inference,
        logger,
        request,
        createLlmInstance,
      })
    )
    .addEdge(START, 'createEsqlQuery')
    .addEdge('createEsqlQuery', 'validateEsqlQuery')
    .addConditionalEdges('validateEsqlQuery', shouldFixEsqlQuery, ['fixEsqlQuery', END])
    .addConditionalEdges('fixEsqlQuery', shouldRetryValidation, ['validateEsqlQuery', END]);

  const graph = esqlQueryGraph.compile();
  graph.name = 'ESQL Query Creation Graph';
  return graph;
};

const shouldFixEsqlQuery = (state: RuleCreationState) => {
  if (state.validationErrors?.esqlErrors) {
    return 'fixEsqlQuery';
  }
  return END;
};

const shouldRetryValidation = (state: RuleCreationState) => {
  // Add logic to prevent infinite loops - limit retries
  const maxRetries = 2;
  const currentRetries = state.queryFixRetries || 0;

  if (currentRetries < maxRetries && state.rule?.query) {
    return 'validateEsqlQuery';
  }
  return END;
};
