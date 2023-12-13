/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { RISK_ENGINE_PRIVILEGES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  RISK_SCORE_PRIVILEGES_CALLOUT,
  RISK_SCORE_STATUS_LOADING,
} from '../../screens/entity_analytics_management';

import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_MANAGEMENT_URL } from '../../urls/navigation';

const loadPageAsUserWithNoPrivileges = () => {
  login(ROLES.no_risk_engine_privileges);
  visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
};

// this test suite doesn't run on serverless because it requires a custom role
describe(
  'Entity analytics management page - Risk Engine Privileges Callout',
  {
    tags: ['@ess'],
  },
  () => {
    it('should not show the callout for superuser', () => {
      cy.intercept(RISK_ENGINE_PRIVILEGES_URL).as('getPrivileges');
      login();
      visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
      cy.wait('@getPrivileges', { timeout: 15000 });
      cy.get(RISK_SCORE_STATUS_LOADING).should('not.exist');
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT).should('not.exist');
    });

    it('should show the callout for user without risk engine privileges', () => {
      cy.intercept(RISK_ENGINE_PRIVILEGES_URL).as('getPrivileges');
      loadPageAsUserWithNoPrivileges();
      cy.get(RISK_SCORE_STATUS_LOADING).should('not.exist');
      cy.wait('@getPrivileges', { timeout: 15000 });
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT);
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT).should(
        'contain',
        'Missing read, write privileges for the risk-score.risk-score-* index.'
      );
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT).should('contain', 'manage_index_templates');
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT).should('contain', 'manage_transform');
    });
  }
);
