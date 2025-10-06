/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATION_BTN,
  MODAL_CONFIRMATION_TITLE,
  SAVE_AND_CONTINUE_BTN,
  SKIP_AGENT_INSTALLATION_BTN,
} from '../screens/integrations';

export const installIntegration = () => {
  cy.get(ADD_INTEGRATION_BTN).click();
  cy.get(SKIP_AGENT_INSTALLATION_BTN).click();
  cy.get(SAVE_AND_CONTINUE_BTN).click();
  cy.get(MODAL_CONFIRMATION_TITLE).should('exist');
};
