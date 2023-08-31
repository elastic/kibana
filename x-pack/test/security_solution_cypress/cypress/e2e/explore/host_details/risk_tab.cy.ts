/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visitHostDetailsPage } from '../../../tasks/login';

import { cleanKibana, waitForTableToLoad } from '../../../tasks/common';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';
import { navigateToHostRiskDetailTab } from '../../../tasks/host_risk';

describe('risk tab', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', { archiveName: 'risk_entities' });
    cy.task('esArchiverLoad', { archiveName: 'query_alert' });
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_entities');
    cy.task('esArchiverUnload', 'query_alert');
  });

  it('renders risk tab and alerts table', () => {
    visitHostDetailsPage('Host-fwarau82er');
    navigateToHostRiskDetailTab();
    waitForTableToLoad();

    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
    cy.get(ALERT_GRID_CELL).contains('Endpoint Security');
  });

  it('shows risk information overlay when button is clicked', () => {
    visitHostDetailsPage('siem-kibana');
    navigateToHostRiskDetailTab();
    waitForTableToLoad();

    cy.get('[data-test-subj="open-risk-information-flyout-trigger"]').click();

    cy.get('[data-test-subj="open-risk-information-flyout"] .euiFlyoutHeader').contains(
      'How is host risk calculated?'
    );
  });
});
