/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON } from '../../screens/expandable_flyout/alert_details_left_panel_prevalence_tab';

/**
 * Open the Prevalence tab under the Visualize tab in the document details expandable flyout left section
 */
export const openPrevalenceTab = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB_PREVALENCE_BUTTON).click();
};
