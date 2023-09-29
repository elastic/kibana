/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BASIC_TABLE_LOADING } from '../screens/common';
import {
  ANOMALIES_TABLE_ROWS,
  ANOMALIES_TABLE_ENABLE_JOB_BUTTON,
  ANOMALIES_TABLE_NEXT_PAGE_BUTTON,
  OPEN_RISK_INFORMATION_FLYOUT_BUTTON,
} from '../screens/entity_analytics';
import { RISK_SCORE_STATUS } from '../screens/entity_analytics_management';
import { ENTITY_ANALYTICS_URL, ENTITY_ANALYTICS_MANAGEMENT_URL } from '../urls/navigation';
import {
  RISK_SCORE_UPDATE_CONFIRM,
  RISK_SCORE_UPDATE_BUTTON,
  RISK_SCORE_SWITCH,
  RISK_PREVIEW_ERROR_BUTTON,
} from '../screens/entity_analytics_management';
import { visitWithTimeRange } from './navigation';

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

export const enableRiskEngine = () => {
  cy.visit(ENTITY_ANALYTICS_MANAGEMENT_URL);
  cy.get(RISK_SCORE_STATUS).should('have.text', 'Off');
  riskEngineStatusChange();
};

export const updateRiskEngine = () => {
  cy.get(RISK_SCORE_UPDATE_BUTTON).click();
};

export const updateRiskEngineConfirm = () => {
  cy.get(RISK_SCORE_UPDATE_CONFIRM).click();
};

export const previewErrorButtonClick = () => {
  cy.get(RISK_PREVIEW_ERROR_BUTTON).click();
};

export const openRiskInformationFlyout = () => cy.get(OPEN_RISK_INFORMATION_FLYOUT_BUTTON).click();

export const upgradeRiskEngine = () => {
  visitWithTimeRange(ENTITY_ANALYTICS_MANAGEMENT_URL);
  updateRiskEngine();
  updateRiskEngineConfirm();
  cy.get(RISK_SCORE_STATUS).should('have.text', 'On');
};
