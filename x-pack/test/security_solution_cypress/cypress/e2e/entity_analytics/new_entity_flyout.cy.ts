/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RiskScoreEntity } from '@kbn/security-solution-plugin/common/search_strategy';
import {
  expandFirstAlertHostFlyout,
  expandFirstAlertUserFlyout,
} from '../../tasks/asset_criticality/common';
import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';
import { ALERTS_URL } from '../../urls/navigation';
import { enableRiskEngine } from '../../tasks/entity_analytics';
import { deleteRiskEngineConfiguration } from '../../tasks/api_calls/risk_engine';
import { USER_PANEL_HEADER } from '../../screens/hosts/flyout_user_panel';
import { getNewRule } from '../../objects/rule';
import { createRule } from '../../tasks/api_calls/rules';
import { waitForAlerts } from '../../tasks/alerts';
import { deleteRiskScore } from '../../tasks/api_calls/risk_scores';
import { deleteAlertsAndRules } from '../../tasks/api_calls/common';
import { HOST_PANEL_HEADER } from '../../screens/hosts/flyout_host_panel';
import { RISK_INPUT_BUTTON, RISK_INPUT_PANEL_HEADER } from '../../screens/hosts/flyout_risk_panel';

const USER_NAME = 'test';
const SIEM_KIBANA_HOST_NAME = 'siem-kibana';

describe(
  'Entity Flyout',
  {
    tags: ['@ess'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolution.enableExperimental=${JSON.stringify([
            'newUserDetailsFlyout',
            'newHostDetailsFlyout',
          ])}`,
        ],
      },
    },
  },
  () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'all_users' });
      login();
      createRule(getNewRule({ query: 'user.name:* or host.name:*', risk_score: 70 }));
      enableRiskEngine();
    });

    after(() => {
      cy.task('esArchiverUnload', 'all_users');
      deleteRiskEngineConfiguration();
      deleteAlertsAndRules();
      deleteRiskScore({ riskScoreEntity: RiskScoreEntity.user, spaceId: 'default' });
    });

    describe('User details', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ALERTS_URL);
        waitForAlerts();
        expandFirstAlertUserFlyout();
      });

      it('should display entity flyout and open risk input panel', () => {
        cy.log('header section');
        cy.get(USER_PANEL_HEADER).should('contain.text', USER_NAME);

        cy.log('risk input');
        cy.get(RISK_INPUT_BUTTON).click();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });
    });

    describe('Host details', () => {
      beforeEach(() => {
        login();
        visitWithTimeRange(ALERTS_URL);
        waitForAlerts();
        expandFirstAlertHostFlyout();
      });

      it('should display entity flyout and open risk input panel', () => {
        cy.log('header section');
        cy.get(HOST_PANEL_HEADER).should('contain.text', SIEM_KIBANA_HOST_NAME);

        cy.log('risk input');
        cy.get(RISK_INPUT_BUTTON).click();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });
    });
  }
);
