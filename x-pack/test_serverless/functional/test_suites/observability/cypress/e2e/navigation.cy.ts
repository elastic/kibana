/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('Serverless', () => {
  it('Should login', () => {
    cy.loginAsElasticUser();
  });

  it('contains the side navigation for observabilitity serverless', () => {
    cy.loginAsElasticUser();
    cy.contains('Discover');
    cy.contains('Dashboards');
    cy.contains('Visualizations');
    cy.contains('Services');
    cy.contains('Traces');
    cy.contains('Dependencies');
    cy.contains('Get started');
    cy.contains('Management');
  });

  it('navigates to discover-dashboard-viz links', () => {
    cy.loginAsElasticUser();

    cy.contains('Discover').click();
    cy.url().should('include', '/app/discover');

    cy.contains('Dashboard').click();
    cy.url().should('include', '/app/dashboards');

    cy.contains('Visualizations').click();
    cy.url().should('include', '/app/visualize');
  });

  it('navigates to alerts links', () => {
    cy.loginAsElasticUser();

    cy.contains('Alerts').click();
    cy.url().should('include', '/observability/alerts');

    cy.contains('Cases').click();
    cy.url().should('include', '/observability/cases');

    cy.contains('SLOs').click();
    cy.url().should('include', '/observability/slos');
  });

  it('navigates to apm links', () => {
    cy.loginAsElasticUser();

    cy.contains('Services').click();
    cy.url().should('include', '/apm/services');

    cy.contains('Traces').click();
    cy.url().should('include', '/apm/traces');

    cy.contains('Dependencies').click();
    cy.url().should('include', '/apm/dependencies/inventory');
  });

  it('navigates to get started links', () => {
    cy.loginAsElasticUser();

    cy.contains('Get started').click();
    cy.url().should('include', '/app/observabilityOnboarding');
  });

  it('navigates to management links', () => {
    cy.loginAsElasticUser();

    cy.contains('Management').click();
    cy.contains('Stack Monitoring').click();
    cy.url().should('include', '/app/monitoring');

    cy.contains('Integrations').click();
    cy.url().should('include', '/app/integrations/browse');

    cy.contains('Fleet').click();
    cy.url().should('include', '/app/fleet/agents');

    cy.contains('Osquery').click();
    cy.url().should('include', 'app/osquery');
  });
});

export {};
