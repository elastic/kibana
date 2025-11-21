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
import { getFindCandidateEntitiesNode } from './nodes/find_candidates';
import { getSelectCandidatesNode } from './nodes/select_candidates';
import { getEnrichEntitiesNode } from './nodes/enrich_entities';
import type { EntityDetailsHighlightsService } from './nodes/enrich_entities/types';
import { getFinalizePrioritiesNode } from './nodes/finalize_priorities';
import { getRefinePrioritiesNode } from './nodes/refine_priorities';
import {
  getSelectCandidatesOrEndEdge,
  getEnrichOrEndEdge,
  getFinalizeOrRefineOrEndEdge,
  getRefineOrEndEdge,
} from './edges';
import type { CombinedPrompts } from './prompts';
import { getDefaultGraphAnnotation } from './state';

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
 * FIND_CANDIDATE_ENTITIES_NODE (find entities with risk spikes, high alerts, etc.)
 *   ↓
 * LLM_SELECT_CANDIDATES_NODE (LLM chooses which candidates to enrich)
 *   ↓
 * ENRICH_ENTITIES_NODE (fetch entity store records, alerts, risk score history)
 *   ↓
 * LLM_FINALIZE_PRIORITIES_NODE (LLM chooses final priorities and summarizes)
 *   ↓ (optional)
 * REFINE_PRIORITIES_NODE (optional refinement)
 *   ↓
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
    const findCandidateEntitiesNode = getFindCandidateEntitiesNode({
      alertsIndexPattern,
      esClient,
      logger,
      namespace,
      riskScoreDataClient,
      riskScoreIndexPattern,
    });

    const selectCandidatesNode = getSelectCandidatesNode({
      llm,
      logger,
      prompts,
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

    const finalizePrioritiesNode = getFinalizePrioritiesNode({
      llm,
      logger,
      prompts,
    });

    const refinePrioritiesNode = getRefinePrioritiesNode({
      llm,
      logger,
      prompts,
    });

    // get edges:
    const selectCandidatesOrEndEdge = getSelectCandidatesOrEndEdge(logger);
    const enrichOrEndEdge = getEnrichOrEndEdge(logger);
    const finalizeOrRefineOrEndEdge = getFinalizeOrRefineOrEndEdge(logger);
    const refineOrEndEdge = getRefineOrEndEdge(logger);

    // create the graph:
    const graph = new StateGraph(graphState)
      .addNode(
        ThreatHuntingPrioritiesNodeType.FIND_CANDIDATE_ENTITIES_NODE,
        findCandidateEntitiesNode
      )
      .addNode(ThreatHuntingPrioritiesNodeType.SELECT_CANDIDATES_NODE, selectCandidatesNode)
      .addNode(ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE, enrichEntitiesNode)
      .addNode(ThreatHuntingPrioritiesNodeType.FINALIZE_PRIORITIES_NODE, finalizePrioritiesNode)
      .addNode(ThreatHuntingPrioritiesNodeType.REFINE_PRIORITIES_NODE, refinePrioritiesNode)
      .addEdge(START, ThreatHuntingPrioritiesNodeType.FIND_CANDIDATE_ENTITIES_NODE)
      .addConditionalEdges(
        ThreatHuntingPrioritiesNodeType.FIND_CANDIDATE_ENTITIES_NODE,
        selectCandidatesOrEndEdge,
        {
          end: END,
          select_candidates: ThreatHuntingPrioritiesNodeType.SELECT_CANDIDATES_NODE,
        }
      )
      .addConditionalEdges(
        ThreatHuntingPrioritiesNodeType.SELECT_CANDIDATES_NODE,
        enrichOrEndEdge,
        {
          end: END,
          enrich: ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE,
        }
      )
      .addEdge(
        ThreatHuntingPrioritiesNodeType.ENRICH_ENTITIES_NODE,
        ThreatHuntingPrioritiesNodeType.FINALIZE_PRIORITIES_NODE
      )
      .addConditionalEdges(
        ThreatHuntingPrioritiesNodeType.FINALIZE_PRIORITIES_NODE,
        finalizeOrRefineOrEndEdge,
        {
          end: END,
          finalize: ThreatHuntingPrioritiesNodeType.FINALIZE_PRIORITIES_NODE,
          refine: ThreatHuntingPrioritiesNodeType.REFINE_PRIORITIES_NODE,
        }
      )
      .addConditionalEdges(
        ThreatHuntingPrioritiesNodeType.REFINE_PRIORITIES_NODE,
        refineOrEndEdge,
        {
          end: END,
          refine: ThreatHuntingPrioritiesNodeType.REFINE_PRIORITIES_NODE,
        }
      );

    // compile the graph:
    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile ThreatHuntingPrioritiesGraph\n${e}`);
  }
};
