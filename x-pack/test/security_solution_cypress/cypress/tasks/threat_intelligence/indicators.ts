/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ADD_INTEGRATIONS_BUTTON,
  FIELD_BROWSER,
  FIELD_BROWSER_MODAL,
  FIELD_BROWSER_MODAL_CLOSE_BUTTON,
  INDICATORS_TABLE,
  INSPECTOR_BUTTON,
  QUERY_INPUT,
} from '../../screens/threat_intelligence/indicators';

/**
 * Navigate to specific page in indicators table
 */
export const navigateToIndicatorsTablePage = (index: number) => {
  cy.get(`[data-test-subj="pagination-button-${index}"]`).click();
};

/**
 * Clears text in KQL bar
 */
export const enterQuery = (text: string) => {
  cy.get(QUERY_INPUT).focus();
  cy.get(QUERY_INPUT).type(text);
};

/**
 * Clears text in KQL bar
 */
export const clearQuery = () => {
  cy.get(QUERY_INPUT).focus();
  cy.get(QUERY_INPUT).clear();
};

/**
 * Open field browser modal
 */
export const openFieldBrowser = () => {
  cy.get(INDICATORS_TABLE).within(() => cy.get(FIELD_BROWSER).last().click());
};

/**
 * Close field browser modal
 */
export const closeFieldBrowser = () =>
  cy.get(FIELD_BROWSER_MODAL).within(() => cy.get(FIELD_BROWSER_MODAL_CLOSE_BUTTON).click());

/**
 * Open inspector flyout
 */
export const openInspector = () => cy.get(INSPECTOR_BUTTON).last().click();

/**
 * Navigate to integrations
 */
export const navigateToIntegrations = () => cy.get(ADD_INTEGRATIONS_BUTTON).click();
