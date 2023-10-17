/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEFT_NAVIGATION } from '../screens/landing_page';
import { navigatesToLandingPage } from '../tasks/navigation';

describe('Serverless', () => {
  it('Should navigate to the landing page', () => {
    cy.visit('/', {
      auth: {
        username: 'elastic_serverless',
        password: 'changeme',
      },
    });
    navigatesToLandingPage();
    cy.get(LEFT_NAVIGATION).should('exist');
  });
});
