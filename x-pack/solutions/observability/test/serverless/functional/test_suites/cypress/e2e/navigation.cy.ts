/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Flaky in serverless tests
describe.skip('Serverless', () => {
  beforeEach(() => {
    cy.loginAsElasticUser();
  });

  it('contains the side navigation for observabilitity serverless', () => {
    cy.loginAsElasticUser();
    cy.contains('Logs Explorer');
    cy.contains('Dashboards');
    cy.contains('Alerts');
    cy.contains('AIOps');
    cy.contains('Applications');
    cy.contains('Cases');
    cy.contains('Visualizations');
    cy.contains('Add data');
  });

  it('navigates to discover-dashboard-viz links', () => {
    cy.loginAsElasticUser();

    cy.contains('Logs Explorer').click();
    cy.url().should('include', '/app/observability-logs-explorer');

    cy.contains('Dashboards').click();
    cy.url().should('include', '/app/dashboards');

    cy.contains('Visualizations').click();
    cy.url().should('include', '/app/visualize');
  });

  it('navigates to alerts links', () => {
    cy.contains('Alerts').click();
    cy.url().should('include', '/observability/alerts');

    cy.contains('Cases').click();
    cy.url().should('include', '/observability/cases');

    cy.contains('SLOs').click();
    cy.url().should('include', '/observability/slos');
  });

  it('navigates to apm links', () => {
    cy.contains('Applications').click();
    cy.contains('Services').click();
    cy.url().should('include', '/apm/services');

    cy.contains('Traces').click();
    cy.url().should('include', '/apm/traces');

    cy.contains('Dependencies').click();
    cy.url().should('include', '/apm/dependencies/inventory');
  });

  it('navigates to get started links', () => {
    cy.contains('Add data').click();
    cy.url().should('include', '/app/observabilityOnboarding');
  });

  it('navigates to AIOps links', () => {
    cy.contains('AIOps').click();
    cy.contains('Anomaly detection').click();
    cy.url().should('include', '/app/ml/jobs');

    cy.contains('Log rate analysis').click();
    cy.url().should('include', '/app/ml/aiops/log_rate_analysis_index_select');

    cy.contains('Log pattern analysis').click();
    cy.url().should('include', '/app/ml/aiops/log_categorization_index_select');

    cy.contains('Change point detection').click();
    cy.url().should('include', '/app/ml/aiops/change_point_detection_index_select');

    cy.contains('Job notifications').click();
    cy.url().should('include', '/app/ml/notifications');
  });

  it('navigates to project settings', () => {
    cy.contains('Project settings').click();
    cy.contains('Management').click();
    cy.url().should('include', '/app/management');

    cy.contains('Integrations').click();
    cy.url().should('include', '/app/integrations/browse');

    cy.contains('Fleet').click();
    cy.url().should('include', '/app/fleet/agents');
  });

  it('sets service nav item as active', () => {
    cy.visitKibana('/app/apm/service-groups');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:services').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );

    cy.visitKibana('/app/apm/service-maps');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:services').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );

    cy.visitKibana('/app/apm/mobile-services/foo');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:services').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );
  });

  it('sets dependencies nav item as active', () => {
    cy.visitKibana('/app/apm/dependencies/inventory');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:dependencies').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );

    cy.visitKibana('/app/apm/dependencies/operations?dependencyName=foo');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:dependencies').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );
  });

  it('sets traces nav item as active', () => {
    cy.visitKibana('/app/apm/traces/explorer/waterfall');

    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:traces').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );

    cy.visitKibana('/app/apm/traces/explorer/critical_path');
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.apm.apm:traces').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );
  });

  it('sets AIOps nav item as active', () => {
    cy.visitKibana('/app/ml/aiops/explain_log_rate_spikes');

    cy.getByTestSubj('nav-item-id-observability_project_nav.aiops').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.aiops.ml:logRateAnalysis').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );

    cy.visitKibana('/app/ml/aiops/change_point_detection');
    cy.getByTestSubj('nav-item-id-observability_project_nav.aiops').should(
      'have.class',
      'euiSideNavItemButton-isOpen'
    );
    cy.getByTestSubj('nav-item-id-observability_project_nav.aiops.ml:changePointDetections').should(
      'have.class',
      'euiSideNavItemButton-isSelected'
    );
  });
});

export {};
