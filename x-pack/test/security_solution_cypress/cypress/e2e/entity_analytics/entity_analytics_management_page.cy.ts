/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { RISK_ENGINE_PRIVILEGES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  PAGE_TITLE,
  HOST_RISK_PREVIEW_TABLE,
  HOST_RISK_PREVIEW_TABLE_ROWS,
  USER_RISK_PREVIEW_TABLE,
  USER_RISK_PREVIEW_TABLE_ROWS,
  RISK_PREVIEW_ERROR,
  LOCAL_QUERY_BAR_SELECTOR,
  RISK_SCORE_ERROR_PANEL,
  RISK_SCORE_STATUS,
  RISK_SCORE_PRIVILEGES_CALLOUT,
  RISK_SCORE_STATUS_LOADING,
} from '../../screens/entity_analytics_management';

import { deleteRiskScore, installRiskScoreModule } from '../../tasks/api_calls/risk_scores';
import { RiskScoreEntity } from '../../tasks/risk_scores/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_MANAGEMENT_URL } from '../../urls/navigation';
import { getNewRule } from '../../objects/rule';
import { createRule } from '../../tasks/api_calls/rules';
import {
  deleteRiskEngineConfiguration,
  interceptRiskPreviewError,
  interceptRiskPreviewSuccess,
  interceptRiskInitError,
} from '../../tasks/api_calls/risk_engine';
import { updateDateRangeInLocalDatePickers } from '../../tasks/date_picker';
import { fillLocalSearchBar, submitLocalSearch } from '../../tasks/search_bar';
import {
  riskEngineStatusChange,
  upgradeRiskEngine,
  previewErrorButtonClick,
} from '../../tasks/entity_analytics';

const loadPageAsUserWithNoPrivileges = () => {
  login(ROLES.reader);
  visit(ENTITY_ANALYTICS_MANAGEMENT_URL, { role: ROLES.reader });
};

describe(
  'Entity analytics management page',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();
      createRule(getNewRule({ query: 'user.name:* or host.name:*', risk_score: 70 }));
      deleteRiskEngineConfiguration();
      visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', 'all_users');
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('have.text', 'Entity Risk Score');
    });

    describe('Risk preview', () => {
      it('risk scores reacts on change in datepicker', () => {
        const START_DATE = 'Jan 18, 2019 @ 20:33:29.186';
        const END_DATE = 'Jan 19, 2019 @ 20:33:29.186';

        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);

        updateDateRangeInLocalDatePickers(LOCAL_QUERY_BAR_SELECTOR, START_DATE, END_DATE);

        cy.get(HOST_RISK_PREVIEW_TABLE).contains('No items found');
        cy.get(USER_RISK_PREVIEW_TABLE).contains('No items found');
      });

      it('risk scores reacts on change in search bar query', () => {
        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 5);

        fillLocalSearchBar('host.name: "test-host1"');
        submitLocalSearch(LOCAL_QUERY_BAR_SELECTOR);

        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).should('have.length', 1);
        cy.get(HOST_RISK_PREVIEW_TABLE_ROWS).contains('test-host1');
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).should('have.length', 1);
        cy.get(USER_RISK_PREVIEW_TABLE_ROWS).contains('test1');
      });

      it('show error panel if API returns error and then try to refetch data', () => {
        interceptRiskPreviewError();

        cy.get(RISK_PREVIEW_ERROR).contains('Preview failed');

        interceptRiskPreviewSuccess();

        previewErrorButtonClick();

        cy.get(RISK_PREVIEW_ERROR).should('not.exist');
      });
    });

    describe('Risk engine', () => {
      it('should init, disable and enable risk engine', () => {
        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        // init
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'On');

        // disable
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        // enable
        riskEngineStatusChange();

        cy.get(RISK_SCORE_STATUS).should('have.text', 'On');
      });

      it('should show error panel if API returns error ', () => {
        cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');

        interceptRiskInitError();

        // init
        riskEngineStatusChange();

        cy.get(RISK_SCORE_ERROR_PANEL).contains('There was an error');
      });

      it('should update if there legacy risk score installed', () => {
        installRiskScoreModule();
        visit(ENTITY_ANALYTICS_MANAGEMENT_URL);

        cy.get(RISK_SCORE_STATUS).should('not.exist');

        upgradeRiskEngine();

        deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId: 'default' });
      });
    });
  }
);

// this test suite doesn't run on serverless because it requires a custom role
describe(
  'Entity analytics management page - Risk Engine Privileges Callout',
  { tags: ['@ess'] },
  () => {
    it('should not show the callout for superuser', () => {
      cy.intercept(RISK_ENGINE_PRIVILEGES_URL).as('getPrivileges');
      login();
      visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
      cy.wait('@getPrivileges', { timeout: 15000 });
      cy.get(RISK_SCORE_STATUS_LOADING, { timeout: 2000 }).should('not.exist');
      cy.get(RISK_SCORE_PRIVILEGES_CALLOUT).should('not.exist');
    });

    it('should show the callout for user without risk engine privileges', () => {
      cy.intercept(RISK_ENGINE_PRIVILEGES_URL).as('getPrivileges');
      loadPageAsUserWithNoPrivileges();
      cy.get(RISK_SCORE_STATUS_LOADING, { timeout: 2000 }).should('not.exist');
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
