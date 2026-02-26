/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_ENGINE_PRIVILEGES_URL } from '@kbn/security-solution-plugin/common/constants';
import { ENTITY_STORE_INTERNAL_PRIVILEGES_URL } from '@kbn/security-solution-plugin/common/entity_analytics/entity_store/constants';
import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_DASHBOARD_URL } from '../../urls/navigation';

import {
  deleteRiskEngineConfiguration,
  deleteEntityStoreEngines,
} from '../../tasks/api_calls/risk_engine';

import {
  ENTITY_STORE_ENABLEMENT_PANEL,
  ENABLEMENT_MODAL_RISK_SCORE_SWITCH,
  ENABLEMENT_MODAL_ENTITY_STORE_SWITCH,
} from '../../screens/entity_analytics/dashboard';
import {
  openEntityStoreEnablementModal,
  confirmEntityStoreEnablement,
  waitForEntitiesListToAppear,
} from '../../tasks/entity_analytics';

// FLAKY: https://github.com/elastic/kibana/issues/248143
describe.skip(
  'Entity analytics dashboard page',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    beforeEach(() => {
      cy.intercept('GET', `**${RISK_ENGINE_PRIVILEGES_URL}`).as('riskEnginePrivileges');
      cy.intercept('GET', `**${ENTITY_STORE_INTERNAL_PRIVILEGES_URL}`).as('entityStorePrivileges');

      login('admin');
      deleteEntityStoreEngines();
      deleteRiskEngineConfiguration();
      visit(ENTITY_ANALYTICS_DASHBOARD_URL);
    });

    after(() => {
      deleteEntityStoreEngines();
      deleteRiskEngineConfiguration();
    });

    describe('Entity Store enablement', () => {
      it('enables risk score followed by the store', () => {
        cy.get(ENTITY_STORE_ENABLEMENT_PANEL).contains('Enable entity store and risk score');

        openEntityStoreEnablementModal();

        cy.get(ENABLEMENT_MODAL_RISK_SCORE_SWITCH).should('be.visible');
        cy.get(ENABLEMENT_MODAL_ENTITY_STORE_SWITCH).should('be.visible');

        confirmEntityStoreEnablement();
        waitForEntitiesListToAppear();
      });
    });
  }
);
