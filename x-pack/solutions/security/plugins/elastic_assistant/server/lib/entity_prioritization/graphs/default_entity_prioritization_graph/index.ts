/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { Replacements } from '@kbn/elastic-assistant-common';
import type { ActionsClientLlm } from '@kbn/langchain/server';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { RiskScoreDataClient } from '@kbn/security-solution-plugin/server/lib/entity_analytics/risk_score/risk_score_data_client';

import { ThreatHuntingPrioritiesNodeType } from './constants';
import { getFindAndSelectCandidatesNode } from './nodes/find_and_select_candidates';
import { getEnrichEntitiesNode } from './nodes/enrich_entities';
import type { EntityDetailsHighlightsService } from './nodes/enrich_entities/types';
import { getGeneratePrioritiesNode } from './nodes/generate_priorities';
import { getEnrichOrEndEdge } from './edges';
import { getDefaultGraphAnnotation } from './state';

// Prompt type for threat hunting priorities
// For PoC, prompts are hardcoded in nodes with fallback defaults
export type CombinedPrompts = Partial<{
  default: string;
  refine: string;
  continue: string;
  selectCandidates: string;
  finalizePriorities: string;
  summary: string;
  priority: string;
}>;

export interface GetDefaultThreatHuntingPrioritiesGraphParams {
  alertsIndexPattern?: string;
  end?: string;
  entityDetailsHighlightsService?: EntityDetailsHighlightsService;
  esClient: ElasticsearchClient;
  entityStoreDataClient?: unknown; // TODO: Type this properly
  filter?: Record<string, unknown>;
  llm: ActionsClientLlm;
  logger?: Logger;
  namespace?: string; // Space ID for risk score queries
  onNewReplacements?: (replacements: Replacements) => void;
  prompts: CombinedPrompts;
  replacements?: Replacements;
  request?: KibanaRequest; // Required for anomalies data
  riskScoreDataClient?: RiskScoreDataClient;
  riskScoreIndexPattern?: string;
  start?: string;
}

export type DefaultThreatHuntingPrioritiesGraph = ReturnType<
  typeof getDefaultThreatHuntingPrioritiesGraph
>;

/**
 * This function returns a compiled state graph that represents the default
 * Threat Hunting Priorities graph.
 *
 * Graph flow:
 * START
 *   ↓
 * FIND_AND_SELECT_CANDIDATES_NODE (find entities with risk spikes, optionally use LLM to select top candidates)
 *   ↓ (conditional: if candidates selected)
 * ENRICH_ENTITIES_NODE (fetch entity store records, alerts, risk score history, asset criticality, vulnerabilities, anomalies)
 *   ↓ (always)
 * GENERATE_PRIORITIES_NODE (LLM generates high-quality, refined prioritized threat hunting priorities)
 *   ↓ (always)
 * END
 */
export const getDefaultThreatHuntingPrioritiesGraph = ({
  alertsIndexPattern,
  end,
  entityDetailsHighlightsService,
  esClient,
  entityStoreDataClient,
  filter,
  llm,
  logger,
  namespace,
  onNewReplacements,
  prompts,
  replacements,
  request,
  riskScoreDataClient,
  riskScoreIndexPattern,
  start,
}: GetDefaultThreatHuntingPrioritiesGraphParams) => {
  try {
    const graphState = getDefaultGraphAnnotation({ end, filter, prompts, start });

    // get nodes:
    const findAndSelectCandidatesNode = getFindAndSelectCandidatesNode({
      alertsIndexPattern,
      esClient,
      llm,
      logger,
      namespace,
      prompts,
      riskScoreDataClient,
      riskScoreIndexPattern,
    });

    const enrichEntitiesNode = getEnrichEntitiesNode({
      alertsIndexPattern,
      entityDetailsHighlightsService,
      esClient,
      entityStoreDataClient,
      logger,
      namespace,
      request,
      riskScoreIndexPattern,
      start,
      end,
    });

    const generatePrioritiesNode = getGeneratePrioritiesNode({
      llm,
      logger,
      prompts,
    });

    // get edges:
    const enrichOrEndEdge = getEnrichOrEndEdge(logger);

    // create the graph:
    const graph = new StateGraph(graphState)
      .addNode(
        ThreatHuntingPrioritiesNodeType.FIND_AND_SELECT_CANDIDATES_NODE,
        findAndSelectCandidatesNode
      )
      .addNode(ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE, enrichEntitiesNode)
      .addNode(ThreatHuntingPrioritiesNodeType.GENERATE_PRIORITIES_NODE, generatePrioritiesNode)
      .addEdge(START, ThreatHuntingPrioritiesNodeType.FIND_AND_SELECT_CANDIDATES_NODE)
      .addConditionalEdges(
        ThreatHuntingPrioritiesNodeType.FIND_AND_SELECT_CANDIDATES_NODE,
        enrichOrEndEdge,
        {
          end: END,
          enrich: ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE,
        }
      )
      .addEdge(
        ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE,
        ThreatHuntingPrioritiesNodeType.GENERATE_PRIORITIES_NODE
      )
      .addEdge(ThreatHuntingPrioritiesNodeType.GENERATE_PRIORITIES_NODE, END);

    // compile the graph:
    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile ThreatHuntingPrioritiesGraph\n${e}`);
  }
};
