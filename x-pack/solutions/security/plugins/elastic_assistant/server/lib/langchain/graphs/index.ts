/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Re-export graph types from @kbn/discoveries
export type {
  AttackDiscoveryGraphMetadata,
  AttackDiscoveryGraphState,
  BaseGraphState,
  DefendInsightsGraphMetadata,
  DefendInsightsGraphState,
  GetAttackDiscoveryGraph,
  GetDefendInsightsGraph,
  GraphInsightTypes,
} from '@kbn/discoveries';
export type {
  DefaultAttackDiscoveryGraph,
  GetDefaultAttackDiscoveryGraphParams,
} from '@kbn/discoveries';
export { getDefaultAttackDiscoveryGraph } from '@kbn/discoveries';
export type {
  DefaultDefendInsightsGraph,
  GetDefaultDefendInsightsGraphParams,
} from '@kbn/discoveries';
export { getDefaultDefendInsightsGraph } from '@kbn/discoveries';

import { getDefaultAttackDiscoveryGraph, getDefaultDefendInsightsGraph } from '@kbn/discoveries';
import type {
  AttackDiscoveryGraphMetadata,
  DefendInsightsGraphMetadata,
  GetAttackDiscoveryGraph,
  GetDefendInsightsGraph,
} from '@kbn/discoveries';
import { DEFEND_INSIGHTS_ID, DefendInsightType } from '@kbn/elastic-assistant-common';
import type {
  GetDefaultAssistantGraphParams,
  DefaultAssistantGraph,
} from './default_assistant_graph/graph';
import { getDefaultAssistantGraph } from './default_assistant_graph/graph';

export type GetAssistantGraph = (
  params: GetDefaultAssistantGraphParams
) => Promise<DefaultAssistantGraph>;

export interface AssistantGraphMetadata {
  getDefaultAssistantGraph: GetAssistantGraph;
  graphType: 'assistant';
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
    getDefaultAttackDiscoveryGraph: getDefaultAttackDiscoveryGraph as GetAttackDiscoveryGraph,
    graphType: 'attack-discovery',
  },
  DefaultDefendInsightsIncompatibleAntivirusGraph: {
    getDefaultDefendInsightsGraph: getDefaultDefendInsightsGraph as GetDefendInsightsGraph,
    graphType: DEFEND_INSIGHTS_ID,
    insightType: DefendInsightType.enum.incompatible_antivirus,
  },
  DefaultDefendInsightsPolicyResponseFailureGraphBar: {
    getDefaultDefendInsightsGraph: getDefaultDefendInsightsGraph as GetDefendInsightsGraph,
    graphType: DEFEND_INSIGHTS_ID,
    insightType: DefendInsightType.enum.policy_response_failure,
  },
};
