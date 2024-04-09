/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GET_INSTALLED_INTEGRATIONS_URL,
  InstalledIntegration,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { login } from './login';
import { visitGetStartedPage } from './navigation';

export const mockFleetInstalledIntegrations = (integrations: InstalledIntegration[] = []) => {
  cy.intercept('GET', `${GET_INSTALLED_INTEGRATIONS_URL}*`, {
    statusCode: 200,
    body: {
      installed_integrations: integrations,
    },
  }).as('installedIntegrations');
};

export const waitForFleetSetup = () => {
  cy.intercept('POST', '/api/fleet/epm/packages/_bulk?prerelease=true').as('fleetSetup');
  cy.clearLocalStorage();
  login();
  visitGetStartedPage();
  cy.wait('@fleetSetup');
};
