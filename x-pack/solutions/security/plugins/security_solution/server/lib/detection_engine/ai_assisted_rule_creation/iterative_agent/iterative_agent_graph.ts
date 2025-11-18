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
import type { AIAssistantKnowledgeBaseDataClient } from '@kbn/elastic-assistant-plugin/server/ai_assistant_data_clients/knowledge_base';
import type { RuleCreationState } from './state';
import { RuleCreationAnnotation } from './state';
import { addDefaultFieldsToRulesNode } from './nodes/add_default_fields_to_rule';
import { createRuleNameAndDescriptionNode } from './nodes/create_rule_name_and_description';
import { getTagsNode } from './nodes/get_tags';
import { getEsqlQueryGraph } from './sub_graphs/esql/esql_query_graph';
import { getIndexPatternNode } from './nodes/get_index_patterns';
import { addScheduleNode } from './nodes/add_schedule';

export const RULE_CREATION_NODE_NAMES = {
  PROCESS_KNOWLEDGE_BASE: 'processKnowledgeBase',
  GET_INDEX_PATTERN: 'getIndexPattern',
  ESQL_QUERY_CREATION: 'esqlQueryCreation',
  GET_TAGS: 'getTags',
  CREATE_RULE_NAME_AND_DESCRIPTION: 'createRuleNameAndDescription',
  ADD_SCHEDULE: 'addSchedule',
  ADD_DEFAULT_FIELDS_TO_RULES: 'addDefaultFieldsToRules',
} as const;

export type RuleCreationNodeName =
  (typeof RULE_CREATION_NODE_NAMES)[keyof typeof RULE_CREATION_NODE_NAMES];

export const RULE_CREATION_NODE_ORDER = [
  RULE_CREATION_NODE_NAMES.PROCESS_KNOWLEDGE_BASE,
  RULE_CREATION_NODE_NAMES.GET_INDEX_PATTERN,
  RULE_CREATION_NODE_NAMES.ESQL_QUERY_CREATION,
  RULE_CREATION_NODE_NAMES.GET_TAGS,
  RULE_CREATION_NODE_NAMES.CREATE_RULE_NAME_AND_DESCRIPTION,
  RULE_CREATION_NODE_NAMES.ADD_SCHEDULE,
  RULE_CREATION_NODE_NAMES.ADD_DEFAULT_FIELDS_TO_RULES,
] as const;

const {
  GET_INDEX_PATTERN,
  ESQL_QUERY_CREATION,
  GET_TAGS,
  CREATE_RULE_NAME_AND_DESCRIPTION,
  ADD_SCHEDULE,
  ADD_DEFAULT_FIELDS_TO_RULES,
} = RULE_CREATION_NODE_NAMES;

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
  kbDataClient?: AIAssistantKnowledgeBaseDataClient | null;
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
  kbDataClient,
}: GetRuleCreationAgentParams) => {
  const esqlQuerySubGraph = await getEsqlQueryGraph({
    model,
    esClient,
    connectorId,
    inference,
    logger,
    request,
    createLlmInstance,
  });

  const ruleCreationAgentGraph = new StateGraph(RuleCreationAnnotation)
    .addNode(GET_INDEX_PATTERN, getIndexPatternNode({ createLlmInstance, esClient }))
    .addNode(ESQL_QUERY_CREATION, esqlQuerySubGraph)
    .addNode(GET_TAGS, getTagsNode({ rulesClient, savedObjectsClient, model }))
    .addNode(CREATE_RULE_NAME_AND_DESCRIPTION, createRuleNameAndDescriptionNode({ model }))
    .addNode(ADD_DEFAULT_FIELDS_TO_RULES, addDefaultFieldsToRulesNode({ model }))
    .addNode(ADD_SCHEDULE, addScheduleNode({ model, logger }))
    .addEdge(START, GET_INDEX_PATTERN)
    .addEdge(GET_INDEX_PATTERN, ESQL_QUERY_CREATION)
    .addEdge(ESQL_QUERY_CREATION, GET_TAGS)
    .addEdge(GET_TAGS, CREATE_RULE_NAME_AND_DESCRIPTION)
    .addEdge(CREATE_RULE_NAME_AND_DESCRIPTION, ADD_SCHEDULE)
    .addConditionalEdges(ADD_SCHEDULE, shouldAddDefaultFieldsToRule, {
      [ADD_DEFAULT_FIELDS_TO_RULES]: ADD_DEFAULT_FIELDS_TO_RULES,
      end: END,
    })
    .addEdge(ADD_DEFAULT_FIELDS_TO_RULES, END);

  const graph = ruleCreationAgentGraph.compile({ checkpointer: undefined });
  graph.name = 'Rule Creation Graph';
  return graph;
};

const shouldAddDefaultFieldsToRule = (state: RuleCreationState) => {
  if (state.rule) {
    return ADD_DEFAULT_FIELDS_TO_RULES;
  }
  return END;
};
