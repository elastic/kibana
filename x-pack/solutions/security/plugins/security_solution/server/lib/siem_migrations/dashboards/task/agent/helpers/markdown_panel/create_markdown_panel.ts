/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParsedPanel } from '../../../../../../../../common/siem_migrations/parsers/types';
import markdownTemplate from './markdown.viz.json';

interface MarkdownPanelJSON {
  title?: string;
  gridData?: { x: number; y: number; w: number; h: number; i: string; sectionId?: string };
  panelIndex?: string;
  embeddableConfig?: {
    savedVis?: {
      params?: {
        markdown?: string;
      };
    };
  };
}

// Create markdown panel with a specific message
export const createMarkdownPanel = (message: string, parsedPanel: ParsedPanel) => {
  const panelJSON: MarkdownPanelJSON = structuredClone(markdownTemplate);
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
