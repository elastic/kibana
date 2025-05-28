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
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';

import type { DefendInsightsGraphState } from '../../../langchain/graphs';
import {
  getGenerateNode,
  getGenerateOrEndEdge,
  getGenerateOrRefineOrEndEdge,
  getRefineNode,
  getRefineOrEndEdge,
  getRetrieveAnonymizedDocsOrGenerateEdge,
} from '../../../langchain/output_chunking';
import { NodeType } from '../../../langchain/graphs/constants';
import { DefendInsightsCombinedPrompts } from './prompts/incompatible_antivirus';
import { getCombinedDefendInsightsPrompt } from './prompts/get_combined_prompt';
import { responseIsHallucinated } from './helpers/response_is_hallucinated';
import { getRetrieveAnonymizedEventsNode } from './nodes/retriever';
import { getDefendInsightsSchema } from './schemas';
import { getDefaultGraphState } from './state';

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
  DefendInsightsGraphState,
  Partial<DefendInsightsGraphState>,
  'generate' | 'refine' | 'retrieve_anonymized_docs' | '__start__'
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

    const generationSchema = getDefendInsightsSchema({ type: insightType, prompts });

    const generateNode = getGenerateNode({
      llm,
      logger,
      getCombinedPromptFn: getCombinedDefendInsightsPrompt,
      responseIsHallucinated,
      generationSchema,
    });

    const refineNode = getRefineNode({
      llm,
      logger,
      responseIsHallucinated,
      generationSchema,
    });

    // get edges:
    const generateOrEndEdge = getGenerateOrEndEdge(logger);
    const generateOrRefineOrEndEdge = getGenerateOrRefineOrEndEdge(logger);
    const refineOrEndEdge = getRefineOrEndEdge(logger);
    const retrieveAnonymizedEventsOrGenerateEdge = getRetrieveAnonymizedDocsOrGenerateEdge(logger);

    // create the graph:
    const graph = new StateGraph<DefendInsightsGraphState>({ channels: graphState })
      .addNode(NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE, retrieveAnonymizedEventsNode)
      .addNode(NodeType.GENERATE_NODE, generateNode)
      .addNode(NodeType.REFINE_NODE, refineNode)
      .addConditionalEdges(START, retrieveAnonymizedEventsOrGenerateEdge, {
        generate: NodeType.GENERATE_NODE,
        retrieve_anonymized_docs: NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE,
      })
      .addConditionalEdges(NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE, generateOrEndEdge, {
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
