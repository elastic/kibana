/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StructuredToolInterface } from '@langchain/core/tools';
import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { Command, END, START, StateGraph } from '@langchain/langgraph';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import { EsqlSelfHealingAnnotation } from './state';

import { nlToEsqlAgentStepRouter, selectIndexStepRouter, validateEsqlFromLastMessageStepRouter } from './step_router';
import { getNlToEsqlAgent } from './nodes/nl_to_esql_agent/nl_to_esql_agent';
import { getValidateEsqlInLastMessageNode } from './nodes/validate_esql_in_last_message_node/validate_esql_in_last_message_node';
import { getInspectIndexMappingTool } from '../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE, NL_TO_ESQL_AGENT_NODE, NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE, TOOLS_NODE } from './nodes/contants';
import { getBuildErrorReportFromLastMessageNode } from './nodes/build_error_report_from_last_message/build_error_report_from_last_message';
import { getBuildSuccessReportFromLastMessageNode } from './nodes/build_success_report_from_last_message/build_success_report_from_last_message';
import { getNlToEsqlAgentWithoutValidation } from './nodes/nl_to_esql_agent_without_validation/nl_to_esql_agent_without_validation';
import { getBuildUnvalidatedReportFromLastMessageNode } from './nodes/build_unvalidated_report_from_last_message/build_unvalidated_report_from_last_message';
import { ActionsClientChatBedrockConverse, ActionsClientChatVertexAI, ActionsClientChatOpenAI } from '@kbn/langchain/server';
import { SELECT_INDEX_GRAPH, SUMMARIZE_OBJECTIVE, VALIDATE_ESQL_IN_LAST_MESSAGE_NODE } from './constants';
import { getSummarizeObjective } from './nodes/summarize_objective/summarize_objective';
import { HumanMessage } from '@langchain/core/messages';
import { getIdentifyIndexGraph } from '../identify_index_graph/identify_index_graph';
import { ToolNode } from '@langchain/langgraph/prebuilt';

export const getEsqlSelfHealingGraph = ({
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
  createLlmInstance: () => ActionsClientChatBedrockConverse | ActionsClientChatVertexAI | ActionsClientChatOpenAI
}) => {

  const inspectIndexMappingTool = getInspectIndexMappingTool({
    esClient,
  });

  const tools: StructuredToolInterface[] = [inspectIndexMappingTool];
  const toolNode = new ToolNode(tools);

  const nlToEsqlAgentNode = getNlToEsqlAgent({
    connectorId,
    inference,
    logger,
    request,
    tools,
  });

  const nlToEsqlAgentWithoutValidationNode = getNlToEsqlAgentWithoutValidation({
    connectorId,
    inference,
    logger,
    request
  });

  const validateEsqlInLastMessageNode = getValidateEsqlInLastMessageNode({
    esClient,
  });

  const buildErrorReportFromLastMessageNode = getBuildErrorReportFromLastMessageNode()

  const buildSuccessReportFromLastMessageNode = getBuildSuccessReportFromLastMessageNode()

  const buildUnvalidatedReportFromLastMessageNode = getBuildUnvalidatedReportFromLastMessageNode()

  const identifyIndexGraph = getIdentifyIndexGraph({
    esClient,
    createLlmInstance,
  })

  const identityIndexSubGraph = async (state: typeof EsqlSelfHealingAnnotation.State) => {
    const childGraphOutput = await identifyIndexGraph.invoke({
      input: state.input,
      objectiveSummary: state.objectiveSummary,
    });

    if(!childGraphOutput.selectedIndexPattern) {
      return new Command({
        update: {
          indexPatternIdentified: false,
          messages: [new HumanMessage({
            content: `We were unable to find an index pattern that is suitable for this query. Please provide a specific index pattern and the fields you want to query. These are the available indicies: \n\n${childGraphOutput.availableIndices.map(i=>`**${i}**`).join("\n")}`
          })],
        }
      });
    }

    return new Command({
      update: {
        indexPatternIdentified: true,
        selectedIndexPattern: childGraphOutput.selectedIndexPattern,
        messages: [ new HumanMessage({
          content: `We have analyzed multiple index patterns to see if they contain the data required for the query. The following index pattern should be used for the query verbaitum: '${childGraphOutput.selectedIndexPattern}'.`
        })],
      }
    });
  };

  const graph = new StateGraph(EsqlSelfHealingAnnotation)
    // Nodes
    .addNode(SUMMARIZE_OBJECTIVE, getSummarizeObjective({ createLlmInstance }))
    .addNode(SELECT_INDEX_GRAPH, identityIndexSubGraph)
    .addNode(NL_TO_ESQL_AGENT_NODE, nlToEsqlAgentNode, {retryPolicy: { maxAttempts: 3 }})
    .addNode(TOOLS_NODE, toolNode)
    .addNode(VALIDATE_ESQL_IN_LAST_MESSAGE_NODE, validateEsqlInLastMessageNode)
    .addNode(BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, buildSuccessReportFromLastMessageNode)
    .addNode(BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, buildErrorReportFromLastMessageNode)
    .addNode(NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE, nlToEsqlAgentWithoutValidationNode)
    .addNode(BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE, buildUnvalidatedReportFromLastMessageNode)

    .addEdge(START, SUMMARIZE_OBJECTIVE)
    .addEdge(SUMMARIZE_OBJECTIVE, SELECT_INDEX_GRAPH)
    .addConditionalEdges(SELECT_INDEX_GRAPH, selectIndexStepRouter, {
      [NL_TO_ESQL_AGENT_NODE]: NL_TO_ESQL_AGENT_NODE,
      [END]: END,
    })
    .addConditionalEdges(NL_TO_ESQL_AGENT_NODE, nlToEsqlAgentStepRouter, {
      [VALIDATE_ESQL_IN_LAST_MESSAGE_NODE]: VALIDATE_ESQL_IN_LAST_MESSAGE_NODE,
      [TOOLS_NODE]: TOOLS_NODE,
    })
    .addConditionalEdges(VALIDATE_ESQL_IN_LAST_MESSAGE_NODE, validateEsqlFromLastMessageStepRouter, {
      [BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE]: BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE,
      [BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE]: BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE,
      [NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE]: NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE,
    })
    .addEdge(TOOLS_NODE, NL_TO_ESQL_AGENT_NODE)
    .addEdge(BUILD_ERROR_REPORT_FROM_LAST_MESSAGE_NODE, NL_TO_ESQL_AGENT_NODE)
    .addEdge(BUILD_SUCCESS_REPORT_FROM_LAST_MESSAGE_NODE, END)
    .addEdge(NL_TO_ESQL_AGENT_WITHOUT_VALIDATION_NODE, BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE)
    .addEdge(BUILD_UNVALIDATED_REPORT_FROM_LAST_MESSAGE_NODE, END)
    .compile();

  return graph;
};
