/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ASSISTANT_GRAPH_MAP,
  AssistantGraphMetadata,
  AttackDiscoveryGraphMetadata,
  DefendInsightsGraphMetadata,
} from '../../../lib/langchain/graphs';

export interface GetGraphsFromNamesResults {
  attackDiscoveryGraphs: AttackDiscoveryGraphMetadata[];
  assistantGraphs: AssistantGraphMetadata[];
  defendInsightsGraphs: DefendInsightsGraphMetadata[];
}

export const getGraphsFromNames = (graphNames: string[]): GetGraphsFromNamesResults =>
  graphNames.reduce<GetGraphsFromNamesResults>(
    (acc, graphName) => {
      const graph = ASSISTANT_GRAPH_MAP[graphName];
      if (graph != null) {
        switch (graph.graphType) {
          case 'assistant':
            return { ...acc, assistantGraphs: [...acc.assistantGraphs, graph] };
          case 'attack-discovery':
            return { ...acc, attackDiscoveryGraphs: [...acc.attackDiscoveryGraphs, graph] };
          case 'defend-insights':
            return { ...acc, defendInsightsGraphs: [...acc.defendInsightsGraphs, graph] };
        }
      }

      return acc;
    },
    {
      attackDiscoveryGraphs: [],
      assistantGraphs: [],
      defendInsightsGraphs: [],
    }
  );
