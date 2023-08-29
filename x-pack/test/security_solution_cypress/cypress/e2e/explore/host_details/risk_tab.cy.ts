/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login, visitHostDetailsPage } from '../../../tasks/login';

import { cleanKibana, waitForTableToLoad } from '../../../tasks/common';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';

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
    cy.get('[data-test-subj="navigation-hostRisk"]').click();
    waitForTableToLoad();

    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
    cy.get(ALERT_GRID_CELL).contains('Endpoint Security');
  });
});
