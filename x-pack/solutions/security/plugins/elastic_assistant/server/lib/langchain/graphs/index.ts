/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Document } from '@langchain/core/documents';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { AttackDiscovery, DefendInsight, Replacements } from '@kbn/elastic-assistant-common';
import { DEFEND_INSIGHTS_ID } from '@kbn/elastic-assistant-common';

import {
  getDefaultAssistantGraph,
  GetDefaultAssistantGraphParams,
  DefaultAssistantGraph,
} from './default_assistant_graph/graph';
import {
  DefaultAttackDiscoveryGraph,
  GetDefaultAttackDiscoveryGraphParams,
  getDefaultAttackDiscoveryGraph,
} from '../../attack_discovery/graphs/default_attack_discovery_graph';
import {
  DefaultDefendInsightsGraph,
  GetDefaultDefendInsightsGraphParams,
  getDefaultDefendInsightsGraph,
} from '../../defend_insights/graphs/default_defend_insights_graph';

export type GetAssistantGraph = (params: GetDefaultAssistantGraphParams) => DefaultAssistantGraph;
export type GetAttackDiscoveryGraph = (
  params: GetDefaultAttackDiscoveryGraphParams
) => DefaultAttackDiscoveryGraph;
export type GetDefendInsightsGraph = (
  params: GetDefaultDefendInsightsGraphParams
) => DefaultDefendInsightsGraph;

export interface AssistantGraphMetadata {
  getDefaultAssistantGraph: GetAssistantGraph;
  graphType: 'assistant';
}

export interface AttackDiscoveryGraphMetadata {
  getDefaultAttackDiscoveryGraph: GetAttackDiscoveryGraph;
  graphType: 'attack-discovery';
}

export interface DefendInsightsGraphMetadata {
  getDefaultDefendInsightsGraph: GetDefendInsightsGraph;
  graphType: typeof DEFEND_INSIGHTS_ID;
}

export type GraphMetadata =
  | AssistantGraphMetadata
  | AttackDiscoveryGraphMetadata
  | DefendInsightsGraphMetadata;

/**
 * Map of the different Assistant Graphs. Useful for running evaluations.
 */
export const ASSISTANT_GRAPH_MAP: Record<string, GraphMetadata> = {
  DefaultAssistantGraph: {
    getDefaultAssistantGraph,
    graphType: 'assistant',
  },
  DefaultAttackDiscoveryGraph: {
    getDefaultAttackDiscoveryGraph,
    graphType: 'attack-discovery',
  },
  DefaultDefendInsightsGraph: {
    getDefaultDefendInsightsGraph,
    graphType: DEFEND_INSIGHTS_ID,
  },
};

export type GraphInsightTypes = AttackDiscovery | DefendInsight;

export interface BaseGraphState<T extends GraphInsightTypes> {
  anonymizedDocuments: Document[];
  combinedGenerations: string;
  combinedRefinements: string;
  continuePrompt: string;
  end?: DateMath;
  errors: string[];
  filter?: Record<string, unknown> | null;
  generationAttempts: number;
  generations: string[];
  hallucinationFailures: number;
  insights: T[] | null;
  maxGenerationAttempts: number;
  maxHallucinationFailures: number;
  maxRepeatedGenerations: number;
  prompt: string;
  refinements: string[];
  refinePrompt: string;
  replacements: Replacements;
  start?: DateMath;
  unrefinedResults: T[] | null;
}

export type AttackDiscoveryGraphState = BaseGraphState<AttackDiscovery>;
export type DefendInsightsGraphState = BaseGraphState<DefendInsight>;
