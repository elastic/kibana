/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MODAL_CONFIRMATION_TITLE, SAVE_AND_CONTINUE_BTN } from '../screens/integrations';

export const installIntegration = () => {
  cy.url({ timeout: 60000 }).should('include', '/add-integration');

  cy.get(SAVE_AND_CONTINUE_BTN, { timeout: 30000 })
    .should('be.visible')
    .should('be.enabled')
    .click();

  cy.get(MODAL_CONFIRMATION_TITLE, { timeout: 60000 }).should('be.visible');
};
