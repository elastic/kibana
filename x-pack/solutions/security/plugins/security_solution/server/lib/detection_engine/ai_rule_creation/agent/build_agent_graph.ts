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
import { createRuleNameAndDescriptionNode } from './nodes/create_rule_name_and_description';
import { getTagsNode } from './nodes/get_tags';
import { getEsqlQueryGraphWithTool } from './sub_graphs/esql_with_tool/esql_query_graph';
import { addScheduleNode } from './nodes/add_schedule';
import { addMitreMappingsNode } from './nodes/add_mitre_mappings';

export const BUILD_AGENT_NODE_NAMES = {
  ESQL_QUERY_CREATION: 'esqlQueryCreation',
  GET_TAGS: 'getTags',
  CREATE_RULE_NAME_AND_DESCRIPTION: 'createRuleNameAndDescription',
  ADD_MITRE_MAPPINGS: 'addMitreMappings',
  ADD_SCHEDULE: 'addSchedule',
} as const;

const {
  ESQL_QUERY_CREATION,
  GET_TAGS,
  CREATE_RULE_NAME_AND_DESCRIPTION,
  ADD_MITRE_MAPPINGS,
  ADD_SCHEDULE,
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
    .addNode(
      ESQL_QUERY_CREATION,
      await getEsqlQueryGraphWithTool({
        model,
        esClient,
        connectorId,
        inference,
        logger,
        request,
        events,
      })
    )
    .addNode(GET_TAGS, getTagsNode({ rulesClient, savedObjectsClient, model, events }))
    .addNode(CREATE_RULE_NAME_AND_DESCRIPTION, createRuleNameAndDescriptionNode({ model, events }))
    .addNode(ADD_MITRE_MAPPINGS, addMitreMappingsNode({ model, events }))
    .addNode(ADD_SCHEDULE, addScheduleNode({ model, logger, events }))
    .addEdge(START, ESQL_QUERY_CREATION)
    .addConditionalEdges(ESQL_QUERY_CREATION, shouldContinue, {
      continue: CREATE_RULE_NAME_AND_DESCRIPTION,
      end: END,
    })
    .addConditionalEdges(CREATE_RULE_NAME_AND_DESCRIPTION, shouldContinue, {
      continue: GET_TAGS,
      end: END,
    })
    .addEdge(GET_TAGS, ADD_MITRE_MAPPINGS)
    .addEdge(ADD_MITRE_MAPPINGS, ADD_SCHEDULE)
    .addEdge(ADD_SCHEDULE, END);

  const graph = buildAgentGraph.compile({ checkpointer: undefined });
  graph.name = 'Detection Engine AI Rule Creation Graph';
  return graph;
};

/**
 * Stop further execution if there are critical errors in the state for mandatory rule fields: query, name, description.
 * Rest fields are optional or can be fillled with default values.
 */
const shouldContinue = (state: RuleCreationState): 'continue' | 'end' => {
  if (state.errors.length > 0) {
    return 'end';
  }
  return 'continue';
};
