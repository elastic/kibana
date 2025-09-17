/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Send } from '@langchain/langgraph';
import { generateAssistantComment } from '../../../../../common/task/util/comments';
import type { ParsedPanel } from '../../../../../../../../common/siem_migrations/parsers/types';
import { DashboardResourceIdentifier } from '../../../../../../../../common/siem_migrations/dashboards/resources';
import type { OriginalDashboardVendor } from '../../../../../../../../common/siem_migrations/model/dashboard_migration.gen';
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type { MigrateDashboardState, TranslatePanelNodeParams, TranslatedPanel } from '../../types';
import { getTranslatePanelGraph } from '../../sub_graphs/translate_panel';
import type { TranslatePanelGraphParams } from '../../sub_graphs/translate_panel/types';
import { createMarkdownPanel } from '../../helpers/markdown_panel/create_markdown_panel';

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
    node: async ({ index, ...nodeParams }) => {
      let translatedPanel: TranslatedPanel;
      try {
        if (!nodeParams.parsed_panel.query) {
          throw new Error('Panel query is missing');
        }

        // Invoke the subgraph to translate the panel
        const output = await translatePanelSubGraph.invoke(nodeParams);

        if (!output.elastic_panel) {
          throw new Error('No panel visualization generated');
        }
        translatedPanel = {
          index,
          title: nodeParams.parsed_panel.title,
          data: output.elastic_panel,
          translation_result: output.translation_result,
          comments: output.comments,
        };
      } catch (err) {
        params.logger.error(`Error translating panel: ${err}`);
        const message = `Error translating panel: ${err.toString()}`;
        translatedPanel = {
          index,
          title: nodeParams.parsed_panel.title,
          data: createMarkdownPanel(message, nodeParams.parsed_panel),
          comments: [generateAssistantComment(message)],
          error: err,
        };
      }

      return { translated_panels: [translatedPanel] };
    },

    // Fan-out: `conditionalEdge` that Send all individual "translatePanel" to be executed in parallel
    conditionalEdge: (state: MigrateDashboardState) => {
      // Pre-condition: `state.parsed_original_dashboard.panels` must not be empty, otherwise the execution will stop here
      const panels = state.parsed_original_dashboard.panels ?? [];
      return panels.map((panel, i) => {
        const resources = filterIdentifiedResources(
          state.original_dashboard.vendor,
          state.resources,
          panel
        );
        const description = state.panel_descriptions[panel.id];
        const translatePanelParams: TranslatePanelNodeParams = {
          parsed_panel: panel,
          description,
          dashboard_description: state.description,
          resources,
          index: i,
        };
        return new Send('translatePanel', translatePanelParams);
      });
    },

    subgraph: translatePanelSubGraph, // Only for the diagram generation
  };
};

/**
 * This function filters the stored resource data that have been received for the entire dashboard,
 * and returns only the resources that have been identified for each specific panel query.
 */
function filterIdentifiedResources(
  vendor: OriginalDashboardVendor,
  resources: MigrationResources,
  panel: ParsedPanel
): MigrationResources {
  const resourceIdentifier = new DashboardResourceIdentifier(vendor);
  const identifiedResources = resourceIdentifier.fromQuery(panel.query);

  const { macros, lookups } = identifiedResources.reduce<{ macros: string[]; lookups: string[] }>(
    (acc, { type, name }) => {
      if (type === 'macro') {
        acc.macros.push(name);
      } else if (type === 'lookup') {
        acc.lookups.push(name);
      }
      return acc;
    },
    { macros: [], lookups: [] }
  );
  const filteredResources: MigrationResources = {};

  const macro = resources.macro?.filter((m) => macros.includes(m.name));
  if (macro?.length) {
    filteredResources.macro = macro;
  }
  const lookup = resources.lookup?.filter((l) => lookups.includes(l.name));
  if (lookup?.length) {
    filteredResources.lookup = lookup;
  }

  return filteredResources;
}
