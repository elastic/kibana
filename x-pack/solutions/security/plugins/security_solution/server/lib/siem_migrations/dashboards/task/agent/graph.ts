/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { migrateDashboardConfigSchema, migrateDashboardState } from './state';
import type { MigrateDashboardGraphParams, MigrateDashboardState } from './types';
import { getParseOriginalDashboardNode } from './nodes/parse_original_dashboard';
import { getCreateDescriptionsNode } from './nodes/create_descriptions';
import { getTranslatePanelNode } from './nodes/translate_panel/translate_panel';
import { getAggregateDashboardNode } from './nodes/aggregate_dashboard';
import { RETRY_POLICY } from './constants';

export function getDashboardMigrationAgent(params: MigrateDashboardGraphParams) {
  const parseOriginalDashboardNode = getParseOriginalDashboardNode(params);
  const createDescriptionsNode = getCreateDescriptionsNode(params);
  const translatePanel = getTranslatePanelNode(params);
  const aggregateDashboardNode = getAggregateDashboardNode();

  const siemMigrationAgentGraph = new StateGraph(
    migrateDashboardState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('parseOriginalDashboard', parseOriginalDashboardNode)
    .addNode('createDescriptions', createDescriptionsNode, {
      retryPolicy: RETRY_POLICY,
    })
    .addNode('translatePanel', translatePanel.node, {
      subgraphs: [translatePanel.subgraph],
    })
    .addNode('aggregateDashboard', aggregateDashboardNode)
    // Edges
    .addEdge(START, 'parseOriginalDashboard')
    .addConditionalEdges('parseOriginalDashboard', parsedDashboardRouter, [
      'createDescriptions',
      'aggregateDashboard',
    ])
    .addConditionalEdges('createDescriptions', translatePanel.conditionalEdge, ['translatePanel'])
    .addEdge('translatePanel', 'aggregateDashboard')
    .addEdge('aggregateDashboard', END);

  const graph = siemMigrationAgentGraph.compile();
  graph.name = 'Dashboard Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}

// Routers
const parsedDashboardRouter = (state: MigrateDashboardState) => {
  return state.parsed_original_dashboard.panels?.length
    ? 'createDescriptions'
    : 'aggregateDashboard';
};
