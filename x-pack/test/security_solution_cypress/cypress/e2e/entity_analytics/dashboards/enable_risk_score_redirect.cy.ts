/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_RISK_SCORE_BUTTON } from '../../../screens/entity_analytics';

import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { clickEnableRiskScore } from '../../../tasks/risk_scores';

import { ENTITY_ANALYTICS_URL } from '../../../urls/navigation';
import { PAGE_TITLE } from '../../../screens/entity_analytics_management';

describe(
  'Enable risk scores from dashboard',
  {
    tags: ['@ess', '@serverless'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify(['entityStoreDisabled'])}`,
        ],
      },
    },
  },
  () => {
    beforeEach(() => {
      login();
      visit(ENTITY_ANALYTICS_URL);
    });

    it('risk enable button should redirect to entity management page', () => {
      cy.get(ENABLE_RISK_SCORE_BUTTON).should('exist');

      clickEnableRiskScore();

      cy.get(PAGE_TITLE).should('have.text', 'Entity Risk Score');
    });
  }
);
