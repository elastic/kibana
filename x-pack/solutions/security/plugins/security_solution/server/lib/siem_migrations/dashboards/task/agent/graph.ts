/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { END, START, StateGraph } from '@langchain/langgraph';
import { getParseOriginalDashboardNode } from './nodes/parse_original_dashboard';
import { migrateDashboardConfigSchema, migrateDashboardState } from './state';
import type { MigrateDashboardGraphParams } from './types';
import {
  fanOutPanelTranslations,
  getTranslatePanelNode,
} from './nodes/translate_panel/translate_panel';
import { getAggregateDashboardNode } from './nodes/aggregate_dashboard';
import { getTranslatePanelGraph } from './sub_graphs/translate_panel';

export function getDashboardMigrationAgent(params: MigrateDashboardGraphParams) {
  const parseOriginalDashboardNode = getParseOriginalDashboardNode();
  const translatePanelNode = getTranslatePanelNode(params);
  const translatePanelSubGraph = getTranslatePanelGraph(params); // only for graph drawing
  const aggregateDashboardNode = getAggregateDashboardNode();

  const siemMigrationAgentGraph = new StateGraph(
    migrateDashboardState,
    migrateDashboardConfigSchema
  )
    // Nodes
    .addNode('parseOriginalDashboard', parseOriginalDashboardNode)
    .addNode('translatePanel', translatePanelNode, { subgraphs: [translatePanelSubGraph] })
    .addNode('aggregateDashboard', aggregateDashboardNode)
    // Edges
    .addEdge(START, 'parseOriginalDashboard')
    .addConditionalEdges('parseOriginalDashboard', fanOutPanelTranslations, ['translatePanel'])
    .addEdge('translatePanel', 'aggregateDashboard')
    .addEdge('aggregateDashboard', END);

  const graph = siemMigrationAgentGraph.compile();
  graph.name = 'Dashboard Migration Graph'; // Customizes the name displayed in LangSmith
  return graph;
}
