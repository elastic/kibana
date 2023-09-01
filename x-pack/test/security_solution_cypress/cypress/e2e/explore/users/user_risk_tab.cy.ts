/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { login, visitUserDetailsPage } from '../../../tasks/login';

import { cleanKibana, waitForTableToLoad } from '../../../tasks/common';

import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';

import { goToUserRiskScoreTab } from '../../../tasks/user_risk';

describe('User risk tab', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverLoad', 'risk_entities');
    cy.task('esArchiverLoad', 'query_alert');
  });

  beforeEach(() => {
    login();
  });

  after(() => {
    cy.task('esArchiverUnload', 'risk_entities');
    cy.task('esArchiverUnload', 'query_alert');
  });

  it('renders risk tab and alerts table', () => {
    visitUserDetailsPage('user1');
    goToUserRiskScoreTab();
    waitForTableToLoad();

    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
    cy.get(ALERT_GRID_CELL).contains('Endpoint Security');
  });
});
