/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  KibanaRequest,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';

import type { InferenceChatModel } from '@kbn/inference-langchain';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { RuleCreationState } from './state';
import { RuleCreationAnnotation } from './state';
import { addDefaultFieldsToRulesNode } from './nodes/add_default_fields_to_rule';

// import { createEsqQueryNode } from './nodes/create_esql_query';
import { nlToEsqlQueryNode } from './nodes/nl_to_esql';
import { validateEsqlQueryNode } from './nodes/validate_esql_query';
import { createRuleNameAndDescriptionNode } from './nodes/create_rule_name_and_description';
import { getIndexPatternNode } from './nodes/get_index_patterns';
import { getTagsNode } from './nodes/get_tags';
import { fixEsqlQueryNode } from './nodes/fix_esql_query';

export interface GetRuleCreationAgentParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
}

export const getIterativeRuleCreationAgent = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
  model,
  savedObjectsClient,
  rulesClient,
}: GetRuleCreationAgentParams) => {
  //   const createEsqlQuery = await createEsqQueryNode({
  //     model,
  //     esClient,
  //     connectorId,
  //     inference,
  //     logger,
  //     request,
  //     createLlmInstance,
  //   });

  const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
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
    .addNode('getTags', getTagsNode({ rulesClient, savedObjectsClient, model }))
    .addNode('getIndexPattern', getIndexPatternNode({ createLlmInstance, esClient }))
    .addNode('createRuleNameAndDescription', createRuleNameAndDescriptionNode({ model }))
    .addNode('addDefaultFieldsToRules', addDefaultFieldsToRulesNode({ model }))
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
    .addEdge(START, 'getIndexPattern')
    .addEdge('getIndexPattern', 'createEsqlQuery')
    .addEdge('createEsqlQuery', 'validateEsqlQuery')
    .addConditionalEdges('validateEsqlQuery', shouldFixEsqlQuery, ['fixEsqlQuery', 'getTags'])
    .addEdge('fixEsqlQuery', 'getTags')
    .addEdge('getTags', 'createRuleNameAndDescription')
    .addConditionalEdges('createRuleNameAndDescription', shouldAddDefaultFieldsToRule, [
      'addDefaultFieldsToRules',
      END,
    ])
    .addEdge('addDefaultFieldsToRules', END);

  const graph = ruleCreationAgentGraph.compile();
  graph.name = 'Rule Creation Graph';
  return graph;
};

const shouldAddDefaultFieldsToRule = (state: RuleCreationState) => {
  if (state.rule) {
    return 'addDefaultFieldsToRules';
  }
  return END;
};

const shouldFixEsqlQuery = (state: RuleCreationState) => {
  if (state.validationErrors?.esqlErrors) {
    return 'fixEsqlQuery';
  }
  return 'getTags';
};
