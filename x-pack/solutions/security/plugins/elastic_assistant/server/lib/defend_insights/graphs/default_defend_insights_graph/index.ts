/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompiledStateGraph } from '@langchain/langgraph';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { END, START, StateGraph } from '@langchain/langgraph';
import { DefendInsightType, Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';

import { DefendInsightsCombinedPrompts } from './nodes/helpers/prompts/incompatible_antivirus';
import type { GraphState } from './types';
import { getRetrieveAnonymizedEventsOrGenerateEdge } from './edges/retrieve_anonymized_events_or_generate';
import { getGenerateNode } from './nodes/generate';
import { getGenerateOrEndEdge } from './edges/generate_or_end';
import { getGenerateOrRefineOrEndEdge } from './edges/generate_or_refine_or_end';
import { getRefineNode } from './nodes/refine';
import { getRefineOrEndEdge } from './edges/refine_or_end';
import { getRetrieveAnonymizedEventsNode } from './nodes/retriever';
import { getDefaultGraphState } from './state';
import { NodeType } from './constants';

export interface GetDefaultDefendInsightsGraphParams {
  insightType: DefendInsightType;
  endpointIds: string[];
  anonymizationFields: AnonymizationFieldResponse[];
  esClient: ElasticsearchClient;
  llm: ActionsClientLlm;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: DefendInsightsCombinedPrompts;
  replacements?: Replacements;
  size?: number;
  start?: string;
  end?: string;
}

export type DefaultDefendInsightsGraph = ReturnType<typeof getDefaultDefendInsightsGraph>;

/**
 * This function returns a compiled state graph that represents the default
 * Defend Insights graph.
 */
export const getDefaultDefendInsightsGraph = ({
  insightType,
  endpointIds,
  anonymizationFields,
  esClient,
  llm,
  logger,
  onNewReplacements,
  prompts,
  replacements,
  size,
  start,
  end,
}: GetDefaultDefendInsightsGraphParams): CompiledStateGraph<
  GraphState,
  Partial<GraphState>,
  'generate' | 'refine' | 'retrieve_anonymized_events' | '__start__'
> => {
  try {
    const graphState = getDefaultGraphState({ prompts, start, end });

    // get nodes:
    const retrieveAnonymizedEventsNode = getRetrieveAnonymizedEventsNode({
      insightType,
      endpointIds,
      anonymizationFields,
      esClient,
      logger,
      onNewReplacements,
      replacements,
      size,
    });

    const generateNode = getGenerateNode({
      insightType,
      llm,
      logger,
      prompts,
    });

    const refineNode = getRefineNode({
      insightType,
      llm,
      logger,
      prompts,
    });

    // get edges:
    const generateOrEndEdge = getGenerateOrEndEdge(logger);

    const generateOrRefineOrEndEdge = getGenerateOrRefineOrEndEdge(logger);

    const refineOrEndEdge = getRefineOrEndEdge(logger);

    const retrieveAnonymizedEventsOrGenerateEdge =
      getRetrieveAnonymizedEventsOrGenerateEdge(logger);

    // create the graph:
    const graph = new StateGraph<GraphState>({ channels: graphState })
      .addNode(NodeType.RETRIEVE_ANONYMIZED_EVENTS_NODE, retrieveAnonymizedEventsNode)
      .addNode(NodeType.GENERATE_NODE, generateNode)
      .addNode(NodeType.REFINE_NODE, refineNode)
      .addConditionalEdges(START, retrieveAnonymizedEventsOrGenerateEdge, {
        generate: NodeType.GENERATE_NODE,
        retrieve_anonymized_events: NodeType.RETRIEVE_ANONYMIZED_EVENTS_NODE,
      })
      .addConditionalEdges(NodeType.RETRIEVE_ANONYMIZED_EVENTS_NODE, generateOrEndEdge, {
        end: END,
        generate: NodeType.GENERATE_NODE,
      })
      .addConditionalEdges(NodeType.GENERATE_NODE, generateOrRefineOrEndEdge, {
        end: END,
        generate: NodeType.GENERATE_NODE,
        refine: NodeType.REFINE_NODE,
      })
      .addConditionalEdges(NodeType.REFINE_NODE, refineOrEndEdge, {
        end: END,
        refine: NodeType.REFINE_NODE,
      });

    // compile the graph:
    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile DefendInsightsGraph\n${e}`);
  }
};
