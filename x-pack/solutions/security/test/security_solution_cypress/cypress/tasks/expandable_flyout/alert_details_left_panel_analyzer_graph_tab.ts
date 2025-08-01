/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON } from '../../screens/expandable_flyout/alert_details_left_panel_analyzer_graph_tab';

/**
 * Open the Graph Analyzer under the Visuablize tab in the document details expandable flyout left section
 */
export const openGraphAnalyzerTab = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_VISUALIZE_TAB_GRAPH_ANALYZER_BUTTON).click();
};
