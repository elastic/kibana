/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Serverless', () => {
  it('Should navigate to the landing page', () => {
    cy.visit('/', {
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    });
    cy.get('[data-test-subj="securitySolutionNavHeading"]').should('exist');
  });
});
