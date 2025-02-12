/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFEND_INSIGHTS_TOOL_ID } from '@kbn/elastic-assistant-common';

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
  graphType: typeof DEFEND_INSIGHTS_TOOL_ID;
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
    graphType: DEFEND_INSIGHTS_TOOL_ID,
  },
};
