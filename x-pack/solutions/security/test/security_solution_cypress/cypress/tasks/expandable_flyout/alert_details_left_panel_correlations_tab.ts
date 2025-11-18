/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CORRELATIONS_ANCESTRY_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  CORRELATIONS_SESSION_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  CORRELATIONS_SOURCE_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON,
  DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON,
  CORRELATIONS_ANCESTRY_SECTION_PREVIEW_BUTTON,
  CORRELATIONS_SESSION_SECTION_PREVIEW_BUTTON,
  CORRELATIONS_SOURCE_SECTION_PREVIEW_BUTTON,
} from '../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';

/**
 * Open the Correlations tab  under the Visuablize tab in the document details expandable flyout left section
 */
export const openCorrelationsTab = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON).click();
};

/**
 * Open timeline from the related by source event
 */
export const openTimelineFromRelatedSourceEvent = () => {
  cy.get(CORRELATIONS_SOURCE_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).click();
};

/**
 * Click expand button from the related by source table
 */
export const clickExpandFromRelatedBySource = (index = 0) => {
  cy.get(CORRELATIONS_SOURCE_SECTION_PREVIEW_BUTTON).eq(index).click();
};

/**
 * Open timeline from the related by ancestry
 */
export const openTimelineFromRelatedByAncestry = () => {
  cy.get(CORRELATIONS_ANCESTRY_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).click();
};

/**
 * Click expand button from the related by ancestry table
 */
export const clickExpandFromRelatedByAncestry = (index = 0) => {
  cy.get(CORRELATIONS_ANCESTRY_SECTION_PREVIEW_BUTTON).eq(index).click();
};

/**
 * Open timeline from the related by source event
 */
export const openTimelineFromRelatedBySession = () => {
  cy.get(CORRELATIONS_SESSION_SECTION_INVESTIGATE_IN_TIMELINE_BUTTON).click();
};

/**
 * Click expand button from the related by session table
 */
export const clickExpandFromRelatedBySession = (index = 0) => {
  cy.get(CORRELATIONS_SESSION_SECTION_PREVIEW_BUTTON).eq(index).click();
};
