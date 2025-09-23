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
import { tool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import type { RuleCreationState } from './state';
import { RuleCreationAnnotation } from './state';
import { createEsqlRuleNode } from './create_esql_rule';
import { addDefaultFieldsToRulesNode } from './nodes/add_default_fields_to_rule';

import { createEsqQueryNode } from './nodes/create_esql_query';
import { nlToEsqlQueryNode } from './nodes/nl_to_esql';
import { validateEsqlQueryNode } from './nodes/validate_esql_query';
import { createRuleNameAndDescriptionNode } from './nodes/create_rule_name_and_description';
import { getIndexPatternNode } from './nodes/get_index_patterns';

export interface GetRuleCreationAgentParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: () => Promise<InferenceChatModel>;
}

export const getIterativeRuleCreationAgent = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
  model,
}: GetRuleCreationAgentParams) => {
  //   const createEsqlRule = createEsqlRuleNode({ model });
  const createEsqlQuery = await createEsqQueryNode({
    model,
    esClient,
    connectorId,
    inference,
    logger,
    request,
    createLlmInstance,
  });

  //   const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
  //     .addNode('createEsqlQuery', createEsqlQuery)
  //     .addNode('validateEsqlQuery', validateEsqlQueryNode)
  //     .addNode('createRuleNameAndDescription', createRuleNameAndDescriptionNode)
  //     .addNode('addTags', addTagsNode)
  //     .addNode('addDefaultFieldsToRules', addDefaultFieldsToRulesNode)
  //     .addNode('runPreview', runPreviewNode)
  //     .addEdge(START, 'createEsqlQuery')
  //     .addEdge('createEsqlQuery', 'validateEsqlQuery')
  //     .addEdge('validateEsqlQuery', 'createRuleNameAndDescription')
  //     .addEdge('createRuleNameAndDescription', 'addTags')
  //     .addEdge('addTags', 'addDefaultFieldsToRules')
  //     .addEdge('addDefaultFieldsToRules', 'runPreview')
  //     .addConditionalEdges('runPreview', shouldAddDefaultFieldsToRule, ['runPreview', END])
  //     .addEdge('runPreview', END);

  const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
    //  .addNode('createEsqlQuery', createEsqlQuery)
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
    .addNode('validateEsqlQuery', validateEsqlQueryNode({ model }))
    .addNode('getIndexPattern', getIndexPatternNode({ model, createLlmInstance, esClient }))
    .addNode('createRuleNameAndDescription', createRuleNameAndDescriptionNode({ model }))
    .addNode('addDefaultFieldsToRules', addDefaultFieldsToRulesNode({ model }))
    .addEdge(START, 'getIndexPattern')
    .addEdge('getIndexPattern', 'createEsqlQuery')
    .addEdge('createEsqlQuery', 'validateEsqlQuery')
    .addEdge('validateEsqlQuery', 'createRuleNameAndDescription')
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
