/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB } from '../../screens/expandable_flyout/alert_details_left_panel';

/**
 * Open the Insights tab in the document details expandable flyout left section
 */
export const openInsightsTab = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).scrollIntoView();
  cy.get(DOCUMENT_DETAILS_FLYOUT_INSIGHTS_TAB).click();
};
