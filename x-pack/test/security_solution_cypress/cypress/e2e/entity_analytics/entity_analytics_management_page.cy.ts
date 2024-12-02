/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  LOCAL_QUERY_BAR_SEARCH_INPUT_SELECTOR,
} from '../../screens/entity_analytics_management';
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
import { submitLocalSearch } from '../../tasks/search_bar';
import {
  riskEngineStatusChange,
  upgradeRiskEngine,
  previewErrorButtonClick,
} from '../../tasks/entity_analytics';

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
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
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
        cy.get(LOCAL_QUERY_BAR_SEARCH_INPUT_SELECTOR).type('host.name: "test-host1"');
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
    });
  }
);
