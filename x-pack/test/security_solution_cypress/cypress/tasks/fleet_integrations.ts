/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GET_ALL_INTEGRATIONS_URL,
  Integration,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { login } from './login';
import { visitGetStartedPage } from './navigation';

export const mockFleetIntegrations = (integrations: Integration[] = []) => {
  cy.intercept('GET', `${GET_ALL_INTEGRATIONS_URL}*`, {
    statusCode: 200,
    body: {
      integrations,
    },
  }).as('integrations');
};

export const waitForFleetSetup = () => {
  cy.intercept('POST', '/api/fleet/epm/packages/_bulk?prerelease=true').as('fleetSetup');
  cy.clearLocalStorage();
  login();
  visitGetStartedPage();
  cy.wait('@fleetSetup');
};
