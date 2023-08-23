/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('[Serverless Observability onboarding] Landing page', () => {
  beforeEach(() => {
    cy.loginAsElasticUser();
  });

  it('shows landing page', () => {
    cy.visitKibana('/app/observabilityOnboarding');
    cy.contains('Get started with Observability');
  });

  describe('Entry point', () => {
    it('from Add data', () => {
      cy.contains('Add data').click();
      cy.url().should('include', '/app/observabilityOnboarding');
    });
  });
});

export {};
