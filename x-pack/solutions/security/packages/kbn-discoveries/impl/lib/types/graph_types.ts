/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { Document } from '@langchain/core/documents';
import type {
  DEFEND_INSIGHTS_ID,
  AttackDiscovery,
  DefendInsight,
  DefendInsightType,
  Replacements,
} from '@kbn/elastic-assistant-common';

import type {
  DefaultAttackDiscoveryGraph,
  GetDefaultAttackDiscoveryGraphParams,
} from '../../attack_discovery/graphs/default_attack_discovery_graph';
import type {
  DefaultDefendInsightsGraph,
  GetDefaultDefendInsightsGraphParams,
} from '../../defend_insights/graphs/default_defend_insights_graph';

export type GetAttackDiscoveryGraph = (
  params: GetDefaultAttackDiscoveryGraphParams
) => DefaultAttackDiscoveryGraph;
export type GetDefendInsightsGraph = (
  params: GetDefaultDefendInsightsGraphParams
) => DefaultDefendInsightsGraph;

export interface AttackDiscoveryGraphMetadata {
  getDefaultAttackDiscoveryGraph: GetAttackDiscoveryGraph;
  graphType: 'attack-discovery';
}

export interface DefendInsightsGraphMetadata {
  getDefaultDefendInsightsGraph: GetDefendInsightsGraph;
  graphType: typeof DEFEND_INSIGHTS_ID;
  insightType: DefendInsightType;
}

// Note: AssistantGraphMetadata and ASSISTANT_GRAPH_MAP are defined in elastic_assistant plugin
// since they include the DefaultAssistantGraph which is plugin-specific.

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

/**
 * Helper to build LangChain Documents from alert strings.
 * Used by Workflows to convert pre-retrieved alerts into the format expected by graphs.
 */
export const alertsToDocuments = (alerts: string[]): Document[] =>
  alerts.map((alert) => ({ pageContent: alert, metadata: {} }));
