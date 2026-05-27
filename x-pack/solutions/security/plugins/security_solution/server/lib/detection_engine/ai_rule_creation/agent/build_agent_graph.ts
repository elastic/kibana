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
import { terminalValidationNode } from './nodes/terminal_validation';

export const BUILD_AGENT_NODE_NAMES = {
  ESQL_QUERY_CREATION: 'esqlQueryCreation',
  GET_TAGS: 'getTags',
  CREATE_RULE_NAME_AND_DESCRIPTION: 'createRuleNameAndDescription',
  ADD_MITRE_MAPPINGS: 'addMitreMappings',
  ADD_SCHEDULE: 'addSchedule',
  TERMINAL_VALIDATION: 'terminalValidation',
  REJECTION: 'rejection',
} as const;

const {
  ESQL_QUERY_CREATION,
  GET_TAGS,
  CREATE_RULE_NAME_AND_DESCRIPTION,
  ADD_MITRE_MAPPINGS,
  ADD_SCHEDULE,
  TERMINAL_VALIDATION,
  REJECTION,
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
    .addNode(TERMINAL_VALIDATION, terminalValidationNode())
    .addNode(REJECTION, rejectionNode)
    .addEdge(START, ESQL_QUERY_CREATION)
    .addConditionalEdges(ESQL_QUERY_CREATION, resolveRejectionRoute, {
      continue: CREATE_RULE_NAME_AND_DESCRIPTION,
      end: END,
      rejection: REJECTION,
    })
    .addConditionalEdges(CREATE_RULE_NAME_AND_DESCRIPTION, resolveRejectionRoute, {
      continue: GET_TAGS,
      end: END,
      rejection: REJECTION,
    })
    .addEdge(GET_TAGS, ADD_MITRE_MAPPINGS)
    .addEdge(ADD_MITRE_MAPPINGS, ADD_SCHEDULE)
    .addEdge(ADD_SCHEDULE, TERMINAL_VALIDATION)
    .addConditionalEdges(TERMINAL_VALIDATION, resolveRejectionRoute, {
      continue: END,
      end: END,
      rejection: REJECTION,
    })
    .addEdge(REJECTION, END);

  const graph = buildAgentGraph.compile({ checkpointer: undefined });
  graph.name = 'Detection Engine AI Rule Creation Graph';
  return graph;
};

/**
 * Route to rejection when the agent deliberately cannot build a rule, to end on
 * system errors, or continue to the next node otherwise.
 */
export const resolveRejectionRoute = (
  state: RuleCreationState
): 'rejection' | 'end' | 'continue' => {
  if (state.rejectionReason) return 'rejection';
  if (state.errors.length > 0) return 'end';
  return 'continue';
};

export const rejectionNode = async (state: RuleCreationState) => {
  if (!state.rejectionReason) return {};
  const { code, details } = state.rejectionReason;
  const { userQuery } = state;

  switch (code) {
    case 'NO_DATA':
      return {
        rejectionMessage: `No relevant data found in your indices for "${userQuery}". Can you point me to a specific index or data source?`,
      };
    case 'INVALID_OUTPUT':
      return {
        rejectionMessage: `I built a rule but it failed validation${
          details ? `: ${details}` : ''
        }. Please retry or rephrase.`,
      };
    case 'INCOHERENT':
      return {
        rejectionMessage: `I couldn't identify a detectable behavior in your request. Can you rephrase what activity to detect — for example, "detect failed login attempts from a single IP"?`,
      };
    case 'NOT_SECURITY_RELEVANT':
      return {
        rejectionMessage: `This doesn't look like a security detection scenario. Try describing suspicious behavior, attack patterns, or anomalies.`,
      };
  }
};
