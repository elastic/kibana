/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RISK_ENGINE_STATUS_URL } from '@kbn/security-solution-plugin/common/constants';
import { BASIC_TABLE_LOADING } from '../screens/common';
import {
  ANOMALIES_TABLE_ROWS,
  ANOMALIES_TABLE_ENABLE_JOB_BUTTON,
  ANOMALIES_TABLE_NEXT_PAGE_BUTTON,
  OPEN_RISK_INFORMATION_FLYOUT_BUTTON,
} from '../screens/entity_analytics';
import { ENTITY_ANALYTICS_URL } from '../urls/navigation';
import {
  RISK_SCORE_SWITCH,
  RISK_PREVIEW_ERROR_BUTTON,
} from '../screens/entity_analytics_management';
import { visitWithTimeRange } from './navigation';
import { GET_DATE_PICKER_APPLY_BUTTON, GLOBAL_FILTERS_CONTAINER } from '../screens/date_picker';
import { REFRESH_BUTTON } from '../screens/security_header';
import {
  ENABLEMENT_MODAL_CONFIRM_BUTTON,
  ENTITIES_LIST_PANEL,
  ENTITY_STORE_ENABLEMENT_BUTTON,
  ENTITY_STORE_ENABLEMENT_MODAL,
} from '../screens/entity_analytics/dashboard';

export const updateDashboardTimeRange = () => {
  // eslint-disable-next-line cypress/no-force
  cy.get(GET_DATE_PICKER_APPLY_BUTTON(GLOBAL_FILTERS_CONTAINER)).click({ force: true }); // Force to fix global timerange flakiness
  // eslint-disable-next-line cypress/no-force
  cy.get(REFRESH_BUTTON).click({ force: true }); // Force to fix even more global timerange flakiness
  cy.get(REFRESH_BUTTON).should('not.have.attr', 'aria-label', 'Needs updating');
};

export const waitForAnomaliesToBeLoaded = () => {
  cy.waitUntil(() => {
    visitWithTimeRange(ENTITY_ANALYTICS_URL);
    cy.get(BASIC_TABLE_LOADING).should('exist');
    cy.get(BASIC_TABLE_LOADING).should('not.exist');
    return cy.get(ANOMALIES_TABLE_ROWS).then((tableRows) => tableRows.length > 1);
  });
};

export const enableJob = () => {
  cy.get(ANOMALIES_TABLE_ENABLE_JOB_BUTTON).click();
};

export const navigateToNextPage = () => {
  cy.get(ANOMALIES_TABLE_NEXT_PAGE_BUTTON).click();
};

export const riskEngineStatusChange = () => {
  cy.get(RISK_SCORE_SWITCH).should('not.have.attr', 'disabled');
  cy.get(RISK_SCORE_SWITCH).click();
};

export const mockRiskEngineEnabled = () => {
  // mock the risk engine status
  cy.intercept('GET', RISK_ENGINE_STATUS_URL, {
    statusCode: 200,
    body: {
      risk_engine_status: 'ENABLED',
      legacy_risk_engine_status: 'INSTALLED',
    },
  }).as('riskEngineStatus');
};

export const previewErrorButtonClick = () => {
  cy.get(RISK_PREVIEW_ERROR_BUTTON).click();
};

export const openRiskInformationFlyout = () => cy.get(OPEN_RISK_INFORMATION_FLYOUT_BUTTON).click();

export const openEntityStoreEnablementModal = () => {
  cy.get(ENTITY_STORE_ENABLEMENT_BUTTON).click();
  cy.get(ENTITY_STORE_ENABLEMENT_MODAL).contains('Entity Analytics Enablement');
};

export const confirmEntityStoreEnablement = () => {
  cy.get(ENABLEMENT_MODAL_CONFIRM_BUTTON).click();
};

export const waitForEntitiesListToAppear = () => {
  cy.get(ENTITIES_LIST_PANEL, { timeout: 30000 }).scrollIntoView();
  cy.get(ENTITIES_LIST_PANEL).contains('Entities');
};
