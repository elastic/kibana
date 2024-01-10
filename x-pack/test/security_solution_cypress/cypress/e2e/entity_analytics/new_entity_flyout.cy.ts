/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  expandFirstAlertHostFlyout,
  expandFirstAlertUserFlyout,
} from '../../tasks/asset_criticality/common';
import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';
import { ALERTS_URL } from '../../urls/navigation';
import { USER_PANEL_HEADER } from '../../screens/hosts/flyout_user_panel';
import { waitForAlerts } from '../../tasks/alerts';
import { HOST_PANEL_HEADER } from '../../screens/hosts/flyout_host_panel';
import { RISK_INPUT_PANEL_HEADER } from '../../screens/flyout_risk_panel';
import { expandRiskInputsFlyoutPanel } from '../../tasks/risk_scores/risk_inputs_flyout_panel';
import { mockRiskEngineEnabled } from '../../tasks/entity_analytics';

const USER_NAME = 'user1';
const SIEM_KIBANA_HOST_NAME = 'Host-fwarau82er';

describe(
  'Entity Flyout',
  {
    tags: ['@ess', '@serverless'],
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
      cy.task('esArchiverLoad', { archiveName: 'risk_scores_new_complete_data' });
      cy.task('esArchiverLoad', { archiveName: 'query_alert' });
    });

    after(() => {
      cy.task('esArchiverUnload', 'risk_scores_new_complete_data');
      cy.task('esArchiverUnload', 'query_alert');
    });

    beforeEach(() => {
      mockRiskEngineEnabled();
      login();
    });

    describe('User details', () => {
      it('should display entity flyout and open risk input panel', () => {
        visitWithTimeRange(ALERTS_URL);
        waitForAlerts();
        expandFirstAlertUserFlyout();

        cy.log('header section');
        cy.get(USER_PANEL_HEADER).should('contain.text', USER_NAME);

        cy.log('risk input');
        expandRiskInputsFlyoutPanel();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });
    });

    describe('Host details', () => {
      it('should display entity flyout and open risk input panel', () => {
        visitWithTimeRange(ALERTS_URL);
        waitForAlerts();
        expandFirstAlertHostFlyout();

        cy.log('header section');
        cy.get(HOST_PANEL_HEADER).should('contain.text', SIEM_KIBANA_HOST_NAME);

        cy.log('risk input');
        expandRiskInputsFlyoutPanel();
        cy.get(RISK_INPUT_PANEL_HEADER).should('exist');
      });
    });
  }
);
