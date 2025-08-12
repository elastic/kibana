/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Send } from '@langchain/langgraph';
import type { MigrateDashboardState, ParsedOriginalPanel } from '../../types';
import { getTranslatePanelGraph } from '../../sub_graphs/translate_panel';
import type { TranslatePanelGraphParams } from '../../sub_graphs/translate_panel/types';

export interface TranslatePanelNodeParams {
  panel: ParsedOriginalPanel;
  index: number;
}

export type TranslatePanelNode = (
  params: TranslatePanelNodeParams
) => Promise<Partial<MigrateDashboardState>>;

// This is a special node, it's goal is to use map-reduce to translate the dashboard panels in parallel.
// - fan-out: the array of parsed_original_panels is split into individual panels for processing via the translatePanelSubGraph
// - fan-in: the results of the individual panel translations are aggregated back into the overall dashboard state via state reducer.
// This is the recommended technique at the time of writing this code. LangGraph docs: https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/.
export const getTranslatePanelNode = (params: TranslatePanelGraphParams): TranslatePanelNode => {
  const translatePanelSubGraph = getTranslatePanelGraph(params);
  return async ({ panel, index }) => {
    try {
      const output = await translatePanelSubGraph.invoke({ original_panel: panel });
      return {
        // Fan-in: translated panels are concatenated by the state reducer, so the results can be aggregated later
        translated_panels: [{ index, panel: output.elastic_panel }],
      };
    } catch (err) {
      // Fan-in: failed panels are concatenated by the state reducer, so the results can be aggregated later
      return {
        failed_panel_translations: [{ index, error_message: err.toString(), details: err }],
      };
    }
  };
};

// Fan-out: for each panel, Send translatePanel to be executed in parallel.
// This function needs to be called inside a `conditionalEdge`
export const fanOutPanelTranslations = (state: MigrateDashboardState) => {
  const panels = state.parsed_original_dashboard.panels ?? [];
  return panels.map((panel, i) => {
    const params: TranslatePanelNodeParams = { panel, index: i };
    return new Send('translatePanel', params);
  });
};
