/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DOCUMENT_FLYOUT_ANALYZER_PREVIEW_TITLE_LINK,
  DOCUMENT_FLYOUT_CORRELATIONS_TITLE_LINK,
  DOCUMENT_FLYOUT_PREVALENCE_TITLE_LINK,
  DOCUMENT_FLYOUT_TABLE_TAB,
  DOCUMENT_FLYOUT_TABLE_TAB_SEARCH_INPUT,
  DOCUMENT_FLYOUT_TAKE_ACTION_BUTTON,
  DOCUMENT_FLYOUT_TAKE_ACTION_MENU,
  DOCUMENT_FLYOUT_THREAT_INTELLIGENCE_TITLE_LINK,
  DOCUMENT_FLYOUT_VISUALIZATIONS_SECTION_HEADER,
} from '../screens/document_flyout';

/**
 * Open the Table tab of the document flyout
 */
export const openDocumentFlyoutTableTab = () => {
  cy.get(DOCUMENT_FLYOUT_TABLE_TAB).click();
};

/**
 * Type a value in the search input of the document flyout Table tab
 */
export const filterDocumentFlyoutTableTab = (filterValue: string) => {
  cy.get(DOCUMENT_FLYOUT_TABLE_TAB_SEARCH_INPUT).type(filterValue);
};

/**
 * Open the Take action dropdown in the document flyout footer and click an item
 */
export const selectDocumentFlyoutTakeActionItem = (item: string) => {
  cy.get(DOCUMENT_FLYOUT_TAKE_ACTION_BUTTON).click();
  cy.get(DOCUMENT_FLYOUT_TAKE_ACTION_MENU).within(() => cy.get(item).click());
};

/**
 * Expand the Visualizations section of the overview tab and open the analyzer tool
 */
export const openDocumentFlyoutAnalyzerTool = () => {
  cy.get(DOCUMENT_FLYOUT_VISUALIZATIONS_SECTION_HEADER).click();
  cy.get(DOCUMENT_FLYOUT_ANALYZER_PREVIEW_TITLE_LINK).click();
};

/**
 * Open the correlations tool from the Insights section of the overview tab
 */
export const openDocumentFlyoutCorrelationsTool = () => {
  cy.get(DOCUMENT_FLYOUT_CORRELATIONS_TITLE_LINK).click();
};

/**
 * Open the prevalence tool from the Insights section of the overview tab
 */
export const openDocumentFlyoutPrevalenceTool = () => {
  cy.get(DOCUMENT_FLYOUT_PREVALENCE_TITLE_LINK).click();
};

/**
 * Open the threat intelligence tool from the Insights section of the overview tab
 */
export const openDocumentFlyoutThreatIntelligenceTool = () => {
  cy.get(DOCUMENT_FLYOUT_THREAT_INTELLIGENCE_TITLE_LINK).click();
};
