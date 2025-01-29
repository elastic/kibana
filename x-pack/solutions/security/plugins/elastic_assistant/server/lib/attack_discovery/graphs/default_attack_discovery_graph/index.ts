/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { Replacements } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import type { CompiledStateGraph } from '@langchain/langgraph';
import { END, START, StateGraph } from '@langchain/langgraph';

import { CombinedPrompts } from './nodes/helpers/prompts';
import { NodeType } from './constants';
import { getGenerateOrEndEdge } from './edges/generate_or_end';
import { getGenerateOrRefineOrEndEdge } from './edges/generate_or_refine_or_end';
import { getRefineOrEndEdge } from './edges/refine_or_end';
import { getRetrieveAnonymizedAlertsOrGenerateEdge } from './edges/retrieve_anonymized_alerts_or_generate';
import { getDefaultGraphState } from './state';
import { getGenerateNode } from './nodes/generate';
import { getRefineNode } from './nodes/refine';
import { getRetrieveAnonymizedAlertsNode } from './nodes/retriever';
import type { GraphState } from './types';

export interface GetDefaultAttackDiscoveryGraphParams {
  alertsIndexPattern?: string;
  anonymizationFields: AnonymizationFieldResponse[];
  end?: string;
  esClient: ElasticsearchClient;
  filter?: Record<string, unknown>;
  llm: ActionsClientLlm;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  size: number;
  start?: string;
}

export type DefaultAttackDiscoveryGraph = ReturnType<typeof getDefaultAttackDiscoveryGraph>;

/**
 * This function returns a compiled state graph that represents the default
 * Attack discovery graph.
 *
 * Refer to the following diagram for this graph:
 * x-pack/solutions/security/plugins/elastic_assistant/docs/img/default_attack_discovery_graph.png
 */
export const getDefaultAttackDiscoveryGraph = ({
  alertsIndexPattern,
  anonymizationFields,
  end,
  esClient,
  filter,
  llm,
  logger,
  onNewReplacements,
  prompts,
  replacements,
  size,
  start,
}: GetDefaultAttackDiscoveryGraphParams): CompiledStateGraph<
  GraphState,
  Partial<GraphState>,
  'generate' | 'refine' | 'retrieve_anonymized_alerts' | '__start__'
> => {
  try {
    const graphState = getDefaultGraphState({ end, filter, prompts, start });

    // get nodes:
    const retrieveAnonymizedAlertsNode = getRetrieveAnonymizedAlertsNode({
      alertsIndexPattern,
      anonymizationFields,
      esClient,
      logger,
      onNewReplacements,
      replacements,
      size,
    });

    const generateNode = getGenerateNode({
      llm,
      logger,
      prompts,
    });

    const refineNode = getRefineNode({
      llm,
      logger,
      prompts,
    });

    // get edges:
    const generateOrEndEdge = getGenerateOrEndEdge(logger);

    const generatOrRefineOrEndEdge = getGenerateOrRefineOrEndEdge(logger);

    const refineOrEndEdge = getRefineOrEndEdge(logger);

    const retrieveAnonymizedAlertsOrGenerateEdge =
      getRetrieveAnonymizedAlertsOrGenerateEdge(logger);

    // create the graph:
    const graph = new StateGraph<GraphState>({ channels: graphState })
      .addNode(NodeType.RETRIEVE_ANONYMIZED_ALERTS_NODE, retrieveAnonymizedAlertsNode)
      .addNode(NodeType.GENERATE_NODE, generateNode)
      .addNode(NodeType.REFINE_NODE, refineNode)
      .addConditionalEdges(START, retrieveAnonymizedAlertsOrGenerateEdge, {
        generate: NodeType.GENERATE_NODE,
        retrieve_anonymized_alerts: NodeType.RETRIEVE_ANONYMIZED_ALERTS_NODE,
      })
      .addConditionalEdges(NodeType.RETRIEVE_ANONYMIZED_ALERTS_NODE, generateOrEndEdge, {
        end: END,
        generate: NodeType.GENERATE_NODE,
      })
      .addConditionalEdges(NodeType.GENERATE_NODE, generatOrRefineOrEndEdge, {
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
    throw new Error(`Unable to compile AttackDiscoveryGraph\n${e}`);
  }
};
