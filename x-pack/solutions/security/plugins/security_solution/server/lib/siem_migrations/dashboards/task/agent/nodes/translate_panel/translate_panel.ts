/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Send } from '@langchain/langgraph';
import type { MigrateDashboardState, TranslatePanelNodeParams } from '../../types';
import { getTranslatePanelGraph } from '../../sub_graphs/translate_panel';
import type { TranslatePanelGraphParams } from '../../sub_graphs/translate_panel/types';

export type TranslatePanelNode = ((
  params: TranslatePanelNodeParams
) => Promise<Partial<MigrateDashboardState>>) & {
  subgraph?: ReturnType<typeof getTranslatePanelGraph>;
};

export interface TranslatePanel {
  node: TranslatePanelNode;
  conditionalEdge: (state: MigrateDashboardState) => Send[];
  subgraph: ReturnType<typeof getTranslatePanelGraph>;
}
// This is a special node, it's goal is to use map-reduce to translate the dashboard panels in parallel.
// This is the recommended technique at the time of writing this code. LangGraph docs: https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/.
export const getTranslatePanelNode = (params: TranslatePanelGraphParams): TranslatePanel => {
  const translatePanelSubGraph = getTranslatePanelGraph(params);
  return {
    // Fan-in: the results of the individual panel translations are aggregated back into the overall dashboard state via state reducer.
    node: async ({ panel, index }) => {
      try {
        if (!panel.query) {
          throw new Error('Panel query is missing');
        }
        const output = await translatePanelSubGraph.invoke({ parsed_panel: panel });
        return {
          // Fan-in: translated panels are concatenated by the state reducer, so the results can be aggregated later
          translated_panels: [
            {
              index,
              data: output.elastic_panel ?? {},
              translation_result: output.translation_result,
            },
          ],
        };
      } catch (err) {
        // Fan-in: failed panels are concatenated by the state reducer, so the results can be aggregated later
        return {
          failed_panel_translations: [
            {
              index,
              error_message: err.toString(),
              details: err,
            },
          ],
        };
      }
    },
    // Fan-out: for each panel, Send translatePanel to be executed in parallel.
    // This function needs to be called inside a `conditionalEdge`
    conditionalEdge: (state: MigrateDashboardState) => {
      const panels = state.parsed_original_dashboard.panels ?? [];
      return panels.map((panel, i) => {
        const translatePanelParams: TranslatePanelNodeParams = { panel, index: i };
        return new Send('translatePanel', translatePanelParams);
      });
    },
    subgraph: translatePanelSubGraph, // Only for the diagram generation
  };
};
