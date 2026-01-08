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
import type { ToolEventEmitter } from '@kbn/agent-builder-server';
import type { RuleCreationState } from './state';
import { RuleCreationAnnotation } from './state';
import { addDefaultFieldsToRulesNode } from './nodes/add_default_fields_to_rule';
import { createRuleNameAndDescriptionNode } from './nodes/create_rule_name_and_description';
import { getTagsNode } from './nodes/get_tags';
import { getEsqlQueryGraphWithTool } from './sub_graphs/esql_with_tool/esql_query_graph';
import { addScheduleNode } from './nodes/add_schedule';
import { addMitreMappingsNode } from './nodes/add_mitre_mappings';

export const BUILD_AGENT_NODE_NAMES = {
  PROCESS_KNOWLEDGE_BASE: 'processKnowledgeBase',
  GET_INDEX_PATTERN: 'getIndexPattern',
  ESQL_QUERY_CREATION: 'esqlQueryCreation',
  GET_TAGS: 'getTags',
  CREATE_RULE_NAME_AND_DESCRIPTION: 'createRuleNameAndDescription',
  ADD_MITRE_MAPPINGS: 'addMitreMappings',
  ADD_SCHEDULE: 'addSchedule',
  ADD_DEFAULT_FIELDS_TO_RULES: 'addDefaultFieldsToRules',
} as const;

const {
  ESQL_QUERY_CREATION,
  GET_TAGS,
  CREATE_RULE_NAME_AND_DESCRIPTION,
  ADD_MITRE_MAPPINGS,
  ADD_SCHEDULE,
  ADD_DEFAULT_FIELDS_TO_RULES,
} = BUILD_AGENT_NODE_NAMES;

export interface GetBuildAgentParams {
  model: InferenceChatModel;
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  savedObjectsClient: SavedObjectsClientContract;
  rulesClient: RulesClient;
  events?: ToolEventEmitter;
}


export const getBuildAgent = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  model,
  savedObjectsClient,
  rulesClient,
  events,
}: GetBuildAgentParams) => {
  const buildAgentGraph = new StateGraph(RuleCreationAnnotation)
    .addNode(ESQL_QUERY_CREATION, await getEsqlQueryGraphWithTool({
      model,
      esClient,
      connectorId,
      inference,
      logger,
      request,
      events,
    }))
    .addNode(GET_TAGS, getTagsNode({ rulesClient, savedObjectsClient, model, events }))
    .addNode(CREATE_RULE_NAME_AND_DESCRIPTION, createRuleNameAndDescriptionNode({ model, events }))
    .addNode(ADD_MITRE_MAPPINGS, addMitreMappingsNode({ model, events }))
    .addNode(ADD_DEFAULT_FIELDS_TO_RULES, addDefaultFieldsToRulesNode({ model, events }))
    .addNode(ADD_SCHEDULE, addScheduleNode({ model, logger, events }))
    .addEdge(START, ESQL_QUERY_CREATION)
    .addEdge(ESQL_QUERY_CREATION, GET_TAGS)
    .addEdge(GET_TAGS, CREATE_RULE_NAME_AND_DESCRIPTION)
    .addEdge(CREATE_RULE_NAME_AND_DESCRIPTION, ADD_MITRE_MAPPINGS)
    .addEdge(ADD_MITRE_MAPPINGS, ADD_SCHEDULE)
    .addConditionalEdges(ADD_SCHEDULE, shouldAddDefaultFieldsToRule, {
      [ADD_DEFAULT_FIELDS_TO_RULES]: ADD_DEFAULT_FIELDS_TO_RULES,
      end: END,
    })
    .addEdge(ADD_DEFAULT_FIELDS_TO_RULES, END);

  const graph = buildAgentGraph.compile({ checkpointer: undefined });
  graph.name = 'Detection Engine AI Assisted Rule Creation Graph';
  return graph;
};

const shouldAddDefaultFieldsToRule = (state: RuleCreationState) => {
  if (state.rule) {
    return ADD_DEFAULT_FIELDS_TO_RULES;
  }
  return END;
};
