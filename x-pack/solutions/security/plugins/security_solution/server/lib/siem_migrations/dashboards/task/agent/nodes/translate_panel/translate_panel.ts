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
import type { MigrationResources } from '../../../../../common/task/retrievers/resource_retriever';
import type {
  MigrateDashboardState,
  TranslatePanelNodeParams,
  TranslatedPanel,
  MigrateDashboardGraphParams,
} from '../../types';
import { getTranslatePanelGraph } from '../../sub_graphs/translate_panel';
import type { TranslatePanelGraphParams } from '../../sub_graphs/translate_panel/types';
import { createMarkdownPanel } from '../../helpers/markdown_panel/create_markdown_panel';

export type TranslatePanelNode = ((
  params: TranslatePanelNodeParams
) => Promise<Partial<MigrateDashboardState>>) & {
  subgraph?: ReturnType<typeof getTranslatePanelGraph>;
};

/** Number of panels to be processed concurrently per dashboard */
const DEFAULT_PANELS_CONCURRENCY = 4;

export interface TranslatePanel {
  node: TranslatePanelNode;
  conditionalEdge: (state: MigrateDashboardState) => Promise<Send[]>;
  subgraph: ReturnType<typeof getTranslatePanelGraph>;
}
// This is a special node, it's goal is to use map-reduce to translate the dashboard panels in parallel.
// This is the recommended technique at the time of writing this code. LangGraph docs: https://langchain-ai.github.io/langgraphjs/how-tos/map-reduce/.
export const getTranslatePanelNode = (params: MigrateDashboardGraphParams): TranslatePanel => {
  // Convert MigrateDashboardGraphParams to TranslatePanelGraphParams
  const translatePanelGraphParams: TranslatePanelGraphParams = {
    model: params.model,
    esScopedClient: params.esScopedClient,
    esqlKnowledgeBase: params.esqlKnowledgeBase,
    dashboardMigrationsRetriever: params.dashboardMigrationsRetriever,
    telemetryClient: params.telemetryClient,
    logger: params.logger,
    inference: params.inference,
    request: params.request,
    connectorId: params.connectorId,
  };

  const translatePanelSubGraph = getTranslatePanelGraph(translatePanelGraphParams);
  return {
    // Fan-in: the results of the individual panel translations are aggregated back into the overall dashboard state via state reducer.
    node: async ({ index, ...nodeParams }) => {
      let translatedPanel: TranslatedPanel;
      try {
        if (!nodeParams.parsed_panel.query) {
          throw new Error('Panel query is missing');
        }

        // Invoke the subgraph to translate the panel
        const output = await translatePanelSubGraph.invoke(nodeParams, {
          maxConcurrency: DEFAULT_PANELS_CONCURRENCY,
        });

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
        const message = `Error translating panel: ${err.toString()}`;
        params.logger.error(message);
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
    conditionalEdge: async (state: MigrateDashboardState) => {
      // Pre-condition: `state.parsed_original_dashboard.panels` must not be empty, otherwise the execution will stop here
      const panels = state.parsed_original_dashboard.panels ?? [];
      const sendNodePromises: Send[] = [];
      for (let i = 0; i < panels.length; i++) {
        const panel = panels[i];
        const resources = await filterIdentifiedResources(
          state.resources,
          panel,
          new DashboardResourceIdentifier(state.original_dashboard.vendor, {
            experimentalFeatures: params.experimentalFeatures,
          })
        );
        const description = state.panel_descriptions[panel.id];
        const translatePanelParams: TranslatePanelNodeParams = {
          parsed_panel: panel,
          description,
          dashboard_description: state.description,
          resources,
          index: i,
        };
        sendNodePromises.push(new Send('translatePanel', translatePanelParams));
      }

      return sendNodePromises;
    },

    subgraph: translatePanelSubGraph, // Only for the diagram generation
  };
};

/**
 * This function filters the stored resource data that have been received for the entire dashboard,
 * and returns only the resources that have been identified for each specific panel query.
 */
async function filterIdentifiedResources(
  resources: MigrationResources,
  panel: ParsedPanel,
  resourceIdentifier: DashboardResourceIdentifier
): Promise<MigrationResources> {
  const identifiedResources = await resourceIdentifier.fromQuery(panel.query);

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
