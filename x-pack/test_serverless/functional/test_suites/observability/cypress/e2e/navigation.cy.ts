/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Serverless', () => {
  it('Should login', () => {
    // TODO move to command
    cy.visit('/', {
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    });
  });

  it('contains the side navigation for observabilitity serverless', () => {
    cy.visit('/', {
      auth: {
        username: 'elastic',
        password: 'changeme',
      },
    });
    cy.contains('Discover');
    cy.contains('Dashboards');
    cy.contains('Visualizations');
    cy.contains('Services');
    cy.contains('Traces');
    cy.contains('Dependencies');
    cy.contains('Get started');
    cy.contains('Management');
  });
});
