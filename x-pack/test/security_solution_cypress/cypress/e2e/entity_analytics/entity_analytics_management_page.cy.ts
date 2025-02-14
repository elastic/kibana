/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PAGE_TITLE,
  RISK_PREVIEW_ERROR,
  RISK_SCORE_ERROR_PANEL,
  RISK_SCORE_STATUS,
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
