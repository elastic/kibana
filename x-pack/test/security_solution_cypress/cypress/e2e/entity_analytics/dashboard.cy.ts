/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../tasks/login';
import { visit } from '../../tasks/navigation';
import { ENTITY_ANALYTICS_DASHBOARD_URL } from '../../urls/navigation';

import { deleteRiskEngineConfiguration } from '../../tasks/api_calls/risk_engine';

import {
  PAGE_TITLE,
  ENTITIES_LIST_PANEL,
  ENTITY_STORE_ENABLEMENT_PANEL,
  ENTITY_STORE_ENABLEMENT_BUTTON,
  ENTITY_STORE_ENABLEMENT_MODAL,
  ENABLEMENT_MODAL_RISK_SCORE_SWITCH,
  ENABLEMENT_MODAL_ENTITY_STORE_SWITCH,
  ENABLEMENT_MODAL_CONFIRM_BUTTON,
} from '../../screens/entity_analytics/dashboard';

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
        cy.get(ENTITY_STORE_ENABLEMENT_PANEL).contains('Enable entity store and risk score');
      });

      it('enables risk score followed by the store', () => {
        cy.get(ENTITY_STORE_ENABLEMENT_BUTTON).click();

        cy.get(ENTITY_STORE_ENABLEMENT_MODAL).should('exist');
        cy.get(ENTITY_STORE_ENABLEMENT_MODAL).contains('Entity Analytics Enablement');

        cy.get(ENABLEMENT_MODAL_RISK_SCORE_SWITCH).should('exist');
        cy.get(ENABLEMENT_MODAL_ENTITY_STORE_SWITCH).should('exist');

        cy.get(ENABLEMENT_MODAL_CONFIRM_BUTTON).should('exist').click();

        cy.get(ENTITIES_LIST_PANEL, { timeout: 30000 }).scrollIntoView();
        cy.get(ENTITIES_LIST_PANEL).contains('Entities');
      });
    });
  }
);
