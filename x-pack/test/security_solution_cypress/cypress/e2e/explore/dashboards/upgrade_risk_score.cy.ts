/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../tags';

import { getNewRule } from '../../../objects/rule';
import { UPGRADE_RISK_SCORE_BUTTON } from '../../../screens/entity_analytics';
import { PAGE_TITLE } from '../../../screens/entity_analytics_management';
import {
  deleteRiskScore,
  installLegacyRiskScoreModule,
} from '../../../tasks/api_calls/risk_scores';
import { clickUpgradeRiskScore } from '../../../tasks/risk_scores';

import { createRule } from '../../../tasks/api_calls/rules';
import { cleanKibana } from '../../../tasks/common';
import { login, visit } from '../../../tasks/login';

import { RiskScoreEntity } from '../../../tasks/risk_scores/common';

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';

const spaceId = 'default';

describe('Upgrade risk scores', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
    login();
    createRule(getNewRule({ rule_id: 'rule1' }));
  });

  beforeEach(() => {
    login();
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.host, spaceId });
    deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId });
    installLegacyRiskScoreModule(RiskScoreEntity.host, spaceId);
    installLegacyRiskScoreModule(RiskScoreEntity.user, spaceId);
    visit(ENTITY_ANALYTICS_URL);
  });

  it('shows upgrade risk button for host and user', () => {
    cy.get(UPGRADE_RISK_SCORE_BUTTON).should('be.visible');

    clickUpgradeRiskScore();

    cy.get(PAGE_TITLE).should('have.text', 'Entity Risk Score');
  });
});
