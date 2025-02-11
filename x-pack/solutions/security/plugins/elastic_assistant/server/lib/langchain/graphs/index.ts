/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export type GetAssistantGraph = (params: GetDefaultAssistantGraphParams) => DefaultAssistantGraph;
export type GetAttackDiscoveryGraph = (
  params: GetDefaultAttackDiscoveryGraphParams
) => DefaultAttackDiscoveryGraph;

export interface AssistantGraphMetadata {
  getDefaultAssistantGraph: GetAssistantGraph;
  graphType: 'assistant';
}

export interface AttackDiscoveryGraphMetadata {
  getDefaultAttackDiscoveryGraph: GetAttackDiscoveryGraph;
  graphType: 'attack-discovery';
}

export type GraphMetadata = AssistantGraphMetadata | AttackDiscoveryGraphMetadata;

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
};
