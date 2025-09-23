/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { GenerateEsqlAnnotation } from './state';

import {
  nlToEsqlAgentStepRouter,
  selectIndexStepRouter,
  validateEsqlFromLastMessageStepRouter,
} from './step_router';
import { getNlToEsqlAgent } from './nodes/nl_to_esql_agent/nl_to_esql_agent';
import { getValidateEsqlInLastMessageNode } from './nodes/validate_esql_in_last_message_node/validate_esql_in_last_message_node';
import { getInspectIndexMappingTool } from '../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import {
  BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE,
  BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE,
  BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE,
  NL_TO_ESQL_AGENT_NODE,
  NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
  SELECT_INDEX_PATTERN_GRAPH,
  TOOLS_NODE,
  VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE,
} from './constants';
import { getBuildErrorReportFromLastMessageNode } from './nodes/build_error_report_from_last_message/build_error_report_from_last_message';
import { getBuildSuccessReportFromLastMessageNode } from './nodes/build_success_report_from_last_message/build_success_report_from_last_message';
import { getNlToEsqlAgentWithoutValidation } from './nodes/nl_to_esql_agent_without_validation/nl_to_esql_agent_without_validation';
import { getBuildUnvalidatedReportFromLastMessageNode } from './nodes/build_unvalidated_report_from_last_message/build_unvalidated_report_from_last_message';

import { getSelectIndexPattern } from './nodes/select_index_pattern/select_index_pattern';
import { getSelectIndexPatternGraph } from '../select_index_pattern/select_index_pattern';
import type { CreateLlmInstance } from '../../utils/common';

export const getGenerateEsqlGraph = async ({
  esClient,
  connectorId,
  inference,
  logger,
  request,
  createLlmInstance,
}: {
  esClient: ElasticsearchClient;
  connectorId: string;
  inference: InferenceServerStart;
  logger: Logger;
  request: KibanaRequest;
  createLlmInstance: CreateLlmInstance;
}) => {
  const nlToEsqlAgentNode = getNlToEsqlAgent({
    connectorId,
    inference,
    logger,
    request,
    tools: [
      getInspectIndexMappingTool({
        esClient,
        indexPattern: 'placeholder',
      }),
    ],
  });

  const nlToEsqlAgentWithoutValidationNode = getNlToEsqlAgentWithoutValidation({
    connectorId,
    inference,
    logger,
    request,
  });

  const validateEsqlInLastMessageNode = getValidateEsqlInLastMessageNode({
    esClient,
  });

  const buildErrorReportFromLastMessageNode = getBuildErrorReportFromLastMessageNode();

  const buildSuccessReportFromLastMessageNode = getBuildSuccessReportFromLastMessageNode();

  const buildUnvalidatedReportFromLastMessageNode = getBuildUnvalidatedReportFromLastMessageNode();

  const identifyIndexGraph = await getSelectIndexPatternGraph({
    esClient,
    createLlmInstance,
  });

  const selectIndexPatternSubGraph = getSelectIndexPattern({
    identifyIndexGraph,
  });

  const graph = new StateGraph(GenerateEsqlAnnotation)
    // Nodes
    .addNode(SELECT_INDEX_PATTERN_GRAPH, selectIndexPatternSubGraph, {
      subgraphs: [identifyIndexGraph],
    })
    .addNode(NL_TO_ESQL_AGENT_NODE, nlToEsqlAgentNode, { retryPolicy: { maxAttempts: 3 } })
    .addNode(TOOLS_NODE, (state: typeof GenerateEsqlAnnotation.State) => {
      const { selectedIndexPattern } = state;
      if (selectedIndexPattern == null) {
        throw new Error('Input is required');
      }
      const inspectIndexMappingTool = getInspectIndexMappingTool({
        esClient,
        indexPattern: selectedIndexPattern,
      });
      const tools = [inspectIndexMappingTool];
      const toolNode = new ToolNode(tools);
      return toolNode.invoke(state);
    })
    .addNode(VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE, validateEsqlInLastMessageNode)
    .addNode(BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, buildSuccessReportFromLastMessageNode)
    .addNode(BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, buildErrorReportFromLastMessageNode)
    .addNode(NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE, nlToEsqlAgentWithoutValidationNode)
    .addNode(
      BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE,
      buildUnvalidatedReportFromLastMessageNode
    )

    // Edges
    .addEdge(START, SELECT_INDEX_PATTERN_GRAPH)
    .addConditionalEdges(SELECT_INDEX_PATTERN_GRAPH, selectIndexStepRouter, {
      [NL_TO_ESQL_AGENT_NODE]: NL_TO_ESQL_AGENT_NODE,
      [END]: END,
    })
    .addConditionalEdges(NL_TO_ESQL_AGENT_NODE, nlToEsqlAgentStepRouter, {
      [VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE]: VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE,
      [TOOLS_NODE]: TOOLS_NODE,
    })
    .addConditionalEdges(
      VALIDATE_ESQL_FROM_LAST_MESSAGE_NODE,
      validateEsqlFromLastMessageStepRouter,
      {
        [BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE]: BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE,
        [BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE]: BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE,
        [NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE]: NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
      }
    )
    .addEdge(TOOLS_NODE, NL_TO_ESQL_AGENT_NODE)
    .addEdge(BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, NL_TO_ESQL_AGENT_NODE)
    .addEdge(BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, END)
    .addEdge(
      NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
      BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE
    )
    .addEdge(BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE, END)
    .compile();

  return graph;
};
