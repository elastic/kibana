/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPanel } from '../../../../../../../../common/siem_migrations/parsers/types';
import type { SavedDashboardPanel } from '../../sub_graphs/translate_panel/nodes/translation_result/dashboard_panel_types';

const MARKDOWN_PANEL_TEMPLATE: SavedDashboardPanel = {
  type: 'visualization',
  gridData: {
    x: 0,
    y: 0,
    w: 12,
    h: 6,
    i: '0735694d-1138-4e11-a315b20',
  },
  panelIndex: '0735694d-1138-4e11-a315-29c0dfdd3b20',
  embeddableConfig: {
    savedVis: {
      id: '',
      title: '',
      description: '',
      type: 'markdown',
      params: {
        fontSize: 12,
        openLinksInNewTab: false,
        markdown: 'Sample text',
      },
      uiState: {},
      data: {
        aggs: [],
        searchSource: {
          query: {
            query: '',
            language: 'kuery',
          },
          filter: [],
        },
      },
    },
    description: '',
    enhancements: {},
  },
  title: 'Markdown',
};

// Create markdown panel with a specific message
export const createMarkdownPanel = (
  message: string,
  parsedPanel: ParsedPanel
): SavedDashboardPanel => {
  const panelJSON = structuredClone(MARKDOWN_PANEL_TEMPLATE);
  // Set panel basic properties
  panelJSON.title = parsedPanel.title;

  // Set position from parsed_panel.position
  if (parsedPanel.position) {
    panelJSON.gridData = {
      x: parsedPanel.position.x,
      y: parsedPanel.position.y,
      w: parsedPanel.position.w,
      h: parsedPanel.position.h,
      i: parsedPanel.id,
      sectionId: parsedPanel.section?.id,
    };
    panelJSON.panelIndex = parsedPanel.id;
  }

  if (panelJSON.embeddableConfig?.savedVis?.params) {
    panelJSON.embeddableConfig.savedVis.params.markdown = message;
  }

  return panelJSON;
};
