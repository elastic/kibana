/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from '../tasks/common';

export const loadEndpointDetailsFlyout = (endpointId: string) =>
  loadPage(
    `/app/security/administration/endpoints?page_index=0&page_size=10&selected_endpoint=${endpointId}&show=details`
  );

export const workflowInsightsSelectors = {
  insightsComponentExists: () => cy.getByTestSubj('endpointDetailsInsightsWrapper').should('exist'),
  addConnectorButtonExists: () => cy.getByTestSubj('addNewConnectorButton').should('exist'),
  chooseConnectorButtonExistsWithLabel: (label: string) =>
    cy.getByTestSubj('connector-selector').contains(label),
  selectConnector: (connectorId?: string) => {
    cy.getByTestSubj('connector-selector').click();
    if (connectorId) return cy.getByTestSubj(connectorId).click();
  },
  selectScanButton: () => cy.getByTestSubj('workflowInsightsScanButton'),
  scanButtonShouldBe: (state: 'enabled' | 'disabled') =>
    workflowInsightsSelectors.selectScanButton().should(`be.${state}`),
  clickScanButton: () => workflowInsightsSelectors.selectScanButton().click(),
  insightsResultExists: (index = 0) =>
    cy.getByTestSubj(`workflowInsightsResult-${index}`).should('exist'),
  clickInsightsResultRemediationButton: (index = 0) =>
    cy.getByTestSubj(`workflowInsightsResult-${index}-remediation`).click(),
  insightsEmptyResultsCalloutDoesNotExist: () =>
    cy.getByTestSubj('workflowInsightsEmptyResultsCallout').should('not.exist'),
  clickTrustedAppFormSubmissionButton: () =>
    cy.getByTestSubj('trustedAppsListPage-flyout-submitButton').click(),
  insightsComponentDoesntExist: () =>
    cy.getByTestSubj('endpointDetailsInsightsWrapper').should('not.exist'),
  validateErrorToastContent: (content: string) =>
    cy
      .getByTestSubj('globalToastList')
      .within(() => cy.getByTestSubj('euiToastBody').contains(content)),
};
