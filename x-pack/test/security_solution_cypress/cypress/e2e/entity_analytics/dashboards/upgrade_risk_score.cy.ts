/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../objects/rule';
import {
  UPGRADE_RISK_SCORE_BUTTON,
  USERS_TABLE,
  HOSTS_TABLE_ROWS,
  HOSTS_TABLE,
  USERS_TABLE_ROWS,
  HOST_RISK_SCORE_NO_DATA_DETECTED,
  USER_RISK_SCORE_NO_DATA_DETECTED,
} from '../../../screens/entity_analytics';
import { PAGE_TITLE } from '../../../screens/entity_analytics_management';
import {
  deleteRiskScore,
  installLegacyRiskScoreModule,
  installRiskScoreModule,
} from '../../../tasks/api_calls/risk_scores';
import { clickUpgradeRiskScore } from '../../../tasks/risk_scores';

import { createRule } from '../../../tasks/api_calls/rules';
import { login } from '../../../tasks/login';
import { visitWithTimeRange } from '../../../tasks/navigation';

import { RiskScoreEntity } from '../../../tasks/risk_scores/common';

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';
import { upgradeRiskEngine } from '../../../tasks/entity_analytics';
import { deleteRiskEngineConfiguration } from '../../../tasks/api_calls/risk_engine';

const spaceId = 'default';

describe('Upgrade risk scores', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteRiskEngineConfiguration();
    createRule(getNewRule({ rule_id: 'rule1' }));
  });

  describe('show upgrade risk button', () => {
    beforeEach(() => {
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
      installLegacyRiskScoreModule(RiskScoreEntity.host, spaceId);
      installLegacyRiskScoreModule(RiskScoreEntity.user, spaceId);
      visitWithTimeRange(ENTITY_ANALYTICS_URL);
    });

    afterEach(() => {
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
      cy.task('esArchiverUnload', { archiveName: 'risk_hosts' });
      cy.task('esArchiverUnload', { archiveName: 'risk_users' });
    });

    it('shows upgrade panel', () => {
      cy.get(UPGRADE_RISK_SCORE_BUTTON).should('be.visible');

      clickUpgradeRiskScore();

      cy.get(PAGE_TITLE).should('have.text', 'Entity Risk Score');
    });
  });

  describe('upgrade risk engine', () => {
    beforeEach(() => {
      cy.task('esArchiverLoad', { archiveName: 'risk_hosts' });
      cy.task('esArchiverLoad', { archiveName: 'risk_users' });
      login();
      installRiskScoreModule();
      visitWithTimeRange(ENTITY_ANALYTICS_URL);
    });

    afterEach(() => {
      cy.task('esArchiverUnload', { archiveName: 'risk_hosts' });
      cy.task('esArchiverUnload', { archiveName: 'risk_users' });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
      deleteRiskEngineConfiguration();
    });

    it('show old risk score data before upgrade, and hide after', () => {
      cy.get(HOSTS_TABLE).should('be.visible');
      cy.get(HOSTS_TABLE_ROWS).should('have.length', 5);

      cy.get(USERS_TABLE).should('be.visible');
      cy.get(USERS_TABLE_ROWS).should('have.length', 5);

      upgradeRiskEngine();

      visitWithTimeRange(ENTITY_ANALYTICS_URL);

      cy.get(HOST_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
      cy.get(USER_RISK_SCORE_NO_DATA_DETECTED).should('be.visible');
    });
  });
});
