/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Flaky in serverless tests
describe.skip('[Serverless Observability onboarding] Landing page', () => {
  beforeEach(() => {
    cy.loginAsElasticUser();
  });

  it('when user navigates to observability onboarding landing page is showed', () => {
    cy.visitKibana('/app/observabilityOnboarding');
    cy.contains('Collect and analyze logs');
  });

  describe('Entry point', () => {
    it('when clicking on Add data the user is navigated to the observability onboarding page', () => {
      cy.contains('Add data').click();
      cy.url().should('include', '/app/observabilityOnboarding');
    });
  });
});

export {};
