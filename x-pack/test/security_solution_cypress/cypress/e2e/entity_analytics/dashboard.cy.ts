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

import { deleteRiskScore, installRiskScoreModule } from '../../tasks/api_calls/risk_scores';
import { RiskScoreEntity } from '../../tasks/risk_scores/common';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_MANAGEMENT_URL } from '../../urls/navigation';

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
  'Entity analytics dashboard page',
  {
    tags: ['@ess'],
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
    });

    beforeEach(() => {
      login();
      deleteRiskEngineConfiguration();
      visit(ENTITY_ANALYTICS_DASHBOARD_URL);
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'all_users' });
    });

    it('renders page as expected', () => {
      cy.get(PAGE_TITLE).should('have.text', 'Entity Analytics');
    });

    describe('Entity Store enablement', () => {
      it('renders enablement panel', () => {
        cy.get(ENTITY_STORE_ENABLEMENT_PANEL).should('exist');
        cy.get(ENTITY_STORE_ENABLEMENT_PANEL).should(
          'have.text',
          'Enable entity store and risk score'
        );
      });

      it('enables risk score followed by the store', () => {
        cy.get(ENTITY_STORE_ENABLEMENT_BUTTON).click();

        cy.get(ENTITY_STORE_ENABLEMENT_MODAL).should('exist');
        cy.get(ENTITY_STORE_ENABLEMENT_MODAL).should('have.text', 'Entity Analytics Enablement');

        cy.get(ENABLEMENT_MODAL_RISK_SCORE_SWITCH).should('exist');
        cy.get(ENABLEMENT_MODAL_ENTITY_STORE_SWITCH).should('exist');

        cy.get(ENABLEMENT_MODAL_CONFIRM_BUTTON).should('exist').click();
      });
    });
  }
);
