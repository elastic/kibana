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
} from '../../../lib/langchain/graphs';

export interface GetGraphsFromNamesResults {
  attackDiscoveryGraphs: AttackDiscoveryGraphMetadata[];
  assistantGraphs: AssistantGraphMetadata[];
}

export const getGraphsFromNames = (graphNames: string[]): GetGraphsFromNamesResults =>
  graphNames.reduce<GetGraphsFromNamesResults>(
    (acc, graphName) => {
      const graph = ASSISTANT_GRAPH_MAP[graphName];
      if (graph != null) {
        return graph.graphType === 'assistant'
          ? { ...acc, assistantGraphs: [...acc.assistantGraphs, graph] }
          : { ...acc, attackDiscoveryGraphs: [...acc.attackDiscoveryGraphs, graph] };
      }

      return acc;
    },
    {
      attackDiscoveryGraphs: [],
      assistantGraphs: [],
    }
  );
