/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { Document } from '@langchain/core/documents';
import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';

import type {
  DefaultAttackDiscoveryGraph,
  GetDefaultAttackDiscoveryGraphParams,
} from '../../attack_discovery/graphs/default_attack_discovery_graph';

// Note: defend_insights graph types are added in a later PR alongside their source files.

export type GetAttackDiscoveryGraph = (
  params: GetDefaultAttackDiscoveryGraphParams
) => DefaultAttackDiscoveryGraph;

export interface AttackDiscoveryGraphMetadata {
  getDefaultAttackDiscoveryGraph: GetAttackDiscoveryGraph;
  graphType: 'attack-discovery';
}

// Note: AssistantGraphMetadata and ASSISTANT_GRAPH_MAP are defined in elastic_assistant plugin
// since they include the DefaultAssistantGraph which is plugin-specific.

export type GraphInsightTypes = AttackDiscovery;

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

/**
 * Helper to build LangChain Documents from alert strings.
 * Used by Workflows to convert pre-retrieved alerts into the format expected by graphs.
 */
export const alertsToDocuments = (alerts: string[]): Document[] =>
  alerts.map((alert) => ({ pageContent: alert, metadata: {} }));
