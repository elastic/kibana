/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-real-events/support';
import 'cypress-axe';

Cypress.Commands.add('loginAsElasticUser', (path?: string) => {
  cy.visit(path ?? '/', {
    auth: {
      username: 'elastic_serverless',
      password: 'changeme',
    },
  });
});

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj*="${selector}"]`);
});
