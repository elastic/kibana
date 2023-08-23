/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import 'cypress-axe';
import 'cypress-real-events/support';
import URL from 'url';

Cypress.Commands.add('loginAsElasticUser', (path?: string) => {
  cy.visit(path ?? '/', {
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });
});

Cypress.Commands.add('getByTestSubj', (selector: string) => {
  return cy.get(`[data-test-subj*="${selector}"]`);
});

Cypress.Commands.add('visitKibana', (url: string, rangeFrom?: string, rangeTo?: string) => {
  const urlPath = URL.format({
    pathname: url,
    query: { rangeFrom, rangeTo },
  });

  cy.visit(urlPath, {
    auth: {
      username: 'elastic',
      password: 'changeme',
    },
  });
  cy.getByTestSubj('kbnLoadingMessage').should('exist');
  cy.getByTestSubj('kbnLoadingMessage').should('not.exist', {
    timeout: 50000,
  });
});
