/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../tasks/login';
import { visitWithTimeRange } from '../../../../tasks/navigation';

import { ENTITY_ANALYTICS_URL } from '../../../../urls/navigation';

import {
  ENABLE_HOST_RISK_SCORE_BUTTON,
  ENABLE_USER_RISK_SCORE_BUTTON,
  HOST_RISK_SCORE_NO_DATA_DETECTED,
  USER_RISK_SCORE_NO_DATA_DETECTED,
} from '../../../../screens/entity_analytics';

describe('Entity Analytics Dashboard', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  describe('legacy risk score', () => {
    describe('Without data', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      it('shows enable host risk button', () => {
        cy.get(ENABLE_HOST_RISK_SCORE_BUTTON).should('be.visible');
      });

      it('shows enable user risk button', () => {
        cy.get(ENABLE_USER_RISK_SCORE_BUTTON).should('be.visible');
      });
    });

    describe('Risk Score enabled but still no data', () => {
      before(() => {
        cy.task('esArchiverLoad', { archiveName: 'risk_hosts_no_data' });
        cy.task('esArchiverLoad', { archiveName: 'risk_users_no_data' });
      });

      beforeEach(() => {
        login();
        visitWithTimeRange(ENTITY_ANALYTICS_URL);
      });

      after(() => {
        cy.task('esArchiverUnload', { archiveName: 'risk_hosts_no_data' });
        cy.task('esArchiverUnload', { archiveName: 'risk_users_no_data' });
      });

      it('shows no data detected prompt for host risk score module', () => {
        cy.get(HOST_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
      });

      it('shows no data detected prompt for user risk score module', () => {
        cy.get(USER_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
      });
    });
  });
});
