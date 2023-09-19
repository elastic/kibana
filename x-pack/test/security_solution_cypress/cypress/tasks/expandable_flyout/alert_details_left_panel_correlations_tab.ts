/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON } from '../../screens/expandable_flyout/alert_details_left_panel_correlations_tab';

/**
 * Open the Correlations tab  under the Visuablize tab in the document details expandable flyout left section
 */
export const openCorrelationsTab = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_CORRELATIONS_BUTTON).should('be.visible').click();
};

export const expandCorrelationsSection = (sectionSelector: string) => {
  cy.get(`${sectionSelector} button`).should('be.visible').click();
};
