/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import type { ElasticsearchClient } from '@kbn/core/server';
import { AnalyzeIndexPatternAnnotation } from './state';
import {
  GET_FIELD_DESCRIPTORS,
  EXPLORE_PARTIAL_INDEX_RESPONDER,
  EXPLORE_PARTIAL_INDEX_AGENT,
  ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT,
  TOOLS,
} from './constants';
import type { CreateLlmInstance } from '../../utils/common';
import { messageContainsToolCalls } from '../../utils/common';
import { getInspectIndexMappingTool } from '../../tools/inspect_index_mapping_tool/inspect_index_mapping_tool';
import { getFieldDescriptors } from './nodes/get_field_descriptors/get_field_descriptors';
import { getAnalyzeCompressedIndexMappingAgent } from './nodes/analyze_compressed_index_mapping_agent/analyze_compressed_index_mapping_agent';
import { getExplorePartialIndexMappingAgent } from './nodes/explore_partial_index_mapping_agent/explore_partial_index_mapping_agent';
import { getExplorePartialIndexMappingResponder } from './nodes/explore_partial_index_mapping_responder/explore_partial_index_mapping_responder';

export const getAnalyzeIndexPatternGraph = async ({
  esClient,
  createLlmInstance,
}: {
  esClient: ElasticsearchClient;
  createLlmInstance: CreateLlmInstance;
}) => {
  const [
    analyzeCompressedIndexMappingAgent,
    explorePartialIndexMappingAgent,
    explorePartialIndexMappingResponder,
  ] = await Promise.all([
    getAnalyzeCompressedIndexMappingAgent({ createLlmInstance }),
    getExplorePartialIndexMappingAgent({ esClient, createLlmInstance }),
    getExplorePartialIndexMappingResponder({ createLlmInstance }),
  ]);

  const graph = new StateGraph(AnalyzeIndexPatternAnnotation)
    .addNode(GET_FIELD_DESCRIPTORS, getFieldDescriptors({ esClient }))
    .addNode(ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT, analyzeCompressedIndexMappingAgent)

    .addNode(EXPLORE_PARTIAL_INDEX_AGENT, explorePartialIndexMappingAgent)
    .addNode(TOOLS, (state: typeof AnalyzeIndexPatternAnnotation.State) => {
      const { input } = state;
      if (input === undefined) {
        throw new Error('Input is required');
      }
      const inspectIndexMappingTool = getInspectIndexMappingTool({
        esClient,
        indexPattern: input.indexPattern,
      });
      const tools = [inspectIndexMappingTool];
      const toolNode = new ToolNode(tools);
      return toolNode.invoke(state);
    })
    .addNode(EXPLORE_PARTIAL_INDEX_RESPONDER, explorePartialIndexMappingResponder)

    .addEdge(START, GET_FIELD_DESCRIPTORS)
    .addConditionalEdges(
      GET_FIELD_DESCRIPTORS,
      (state: typeof AnalyzeIndexPatternAnnotation.State) => {
        if (state.fieldDescriptors === undefined) {
          throw new Error('Expected field descriptors to be defined');
        }
        return state.fieldDescriptors.length > 2500
          ? EXPLORE_PARTIAL_INDEX_AGENT
          : ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT;
      },
      {
        [EXPLORE_PARTIAL_INDEX_AGENT]: EXPLORE_PARTIAL_INDEX_AGENT,
        [ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT]: ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT,
      }
    )
    .addEdge(ANALYZE_COMPRESSED_INDEX_MAPPING_AGENT, END)

    .addConditionalEdges(
      EXPLORE_PARTIAL_INDEX_AGENT,
      (state: typeof AnalyzeIndexPatternAnnotation.State) => {
        if (messageContainsToolCalls(state.messages[state.messages.length - 1])) {
          return TOOLS;
        }
        return EXPLORE_PARTIAL_INDEX_RESPONDER;
      },
      {
        [TOOLS]: TOOLS,
        [EXPLORE_PARTIAL_INDEX_RESPONDER]: EXPLORE_PARTIAL_INDEX_RESPONDER,
      }
    )
    .addEdge(TOOLS, EXPLORE_PARTIAL_INDEX_AGENT)
    .addEdge(EXPLORE_PARTIAL_INDEX_RESPONDER, END)
    .compile();

  return graph;
};
