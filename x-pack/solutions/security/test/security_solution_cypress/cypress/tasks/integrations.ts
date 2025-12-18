/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_BTN,
  CREATE_PACKAGE_POLICY_BOTTOM_BAR,
  MODAL_CONFIRMATION_TITLE,
  PROGRESSBAR,
  SAVE_AND_CONTINUE_BTN,
  SKIP_AGENT_INSTALLATION_BTN,
  BOTTOM_BAR,
} from '../screens/integrations';

export const installIntegration = () => {
  cy.get(ADD_INTEGRATION_BTN).click();

  // Wait for the page to load - check which layout we're in
  cy.get(BOTTOM_BAR, { timeout: 60000 }).should('be.visible');

  // Handle both layouts: multi-page (has skip button) or single-page (no skip button)
  cy.get('body').then(($body) => {
    const skipButton = $body.find(SKIP_AGENT_INSTALLATION_BTN);

    if (skipButton.length > 0) {
      // Multi-page layout: Click skip to navigate to single-page layout
      cy.get(CREATE_PACKAGE_POLICY_BOTTOM_BAR, { timeout: 30000 }).within(() => {
        // Wait for loading to finish
        cy.get(PROGRESSBAR, { timeout: 60000 }).should('not.exist');

        // Click skip button - it's an EuiButtonEmpty containing the span
        cy.get(SKIP_AGENT_INSTALLATION_BTN).parent('button').should('not.be.disabled').click();
      });
    }
  });

  // Now we're on the integration form (single-page layout) in both cases
  cy.get(SAVE_AND_CONTINUE_BTN, { timeout: 30000 }).click();

  cy.get(MODAL_CONFIRMATION_TITLE, { timeout: 60000 }).should('be.visible');
};
