/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepReadonly } from 'utility-types';
import { closeAllToasts } from '../tasks/toasts';
import { APP_ENDPOINTS_PATH } from '../../../../common/constants';
import type { EndpointManagementPageMap } from './page_reference';
import { getEndpointManagementPageMap } from './page_reference';
import type { UserAuthzAccessLevel } from './types';
import { getNoPrivilegesPage } from './common';
import { loadPage, waitForPageToBeLoaded } from '../tasks/common';
import { APP_PATH } from '../../../../common';
import { getEndpointDetailsPath } from '../../common/routing';

interface ListRowOptions {
  endpointId?: string;
  hostName?: string;
  /** Zero-based row index */
  rowIndex?: number;
}

export const TABLE_ROW_ACTIONS_MENU = 'tableRowActionsMenuPanel';
export const AGENT_HOSTNAME_CELL = 'hostnameCellLink';
export const AGENT_POLICY_CELL = 'policyNameCellLink';
export const TABLE_ROW_ACTIONS = 'endpointTableRowActions';

const pageById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

export const visitEndpointList = (): Cypress.Chainable => {
  cy.visit(pageById.endpointList.url);
  return cy.getByTestSubj('globalLoadingIndicator').should('not.exist');
};

/**
 * Validate that the endpoint list has the proper level of authz
 *
 * @param accessLevel
 * @param visitPage if `true`, then the endpoint list page will be visited first
 */
export const ensureEndpointListPageAuthzAccess = (
  accessLevel: UserAuthzAccessLevel,
  visitPage: boolean = false
): Cypress.Chainable => {
  if (visitPage) {
    visitEndpointList();
  }

  if (accessLevel === 'none') {
    return getNoPrivilegesPage().should('exist');
  }

  // Read and All are currently the same
  return getNoPrivilegesPage().should('not.exist');
};

export const getTableRow = ({
  endpointId,
  hostName,
  rowIndex = 0,
}: ListRowOptions = {}): Cypress.Chainable => {
  if (endpointId) {
    return cy.get(`tr[data-endpoint-id="${endpointId}"]`).should('exist');
  }

  if (hostName) {
    return cy.getByTestSubj('hostnameCellLink').contains(hostName).closest('tr').should('exist');
  }

  return cy
    .getByTestSubj('endpointListTable')
    .find(`tbody tr[data-endpoint-id]`)
    .eq(rowIndex)
    .should('exist');
};

export const openRowActionMenu = (options?: ListRowOptions): Cypress.Chainable => {
  getTableRow(options).findByTestSubj('endpointTableRowActions', { log: true }).click();
  return cy.getByTestSubj('tableRowActionsMenuPanel');
};

export const openConsoleFromEndpointList = (options?: ListRowOptions): Cypress.Chainable => {
  return openRowActionMenu(options).findByTestSubj('console').click();
};

export const getUnIsolateActionMenuItem = (): Cypress.Chainable => {
  return cy.getByTestSubj('tableRowActionsMenuPanel').findByTestSubj('unIsolateLink');
};

export const getConsoleActionMenuItem = (): Cypress.Chainable => {
  return cy.getByTestSubj('tableRowActionsMenuPanel').findByTestSubj('console');
};

export const navigateToEndpointPolicyResponse = (endpointAgentId: string): void => {
  loadPage(
    APP_PATH +
      getEndpointDetailsPath({ name: 'endpointPolicyResponse', selected_endpoint: endpointAgentId })
  );
};

/**
 * Navigate to the Endpoint List page without reloading the entire page (thus perservind in memory state through out app)
 */
export const navigateToEndpointList = (
  /** If defined, we'll wait until that host name appears on the list (assumes its on page 1) */
  endpointHostName?: string
): void => {
  cy.getByTestSubj('nav-search-input').type('endpoints');
  cy.getByTestSubj('nav-search-option', { timeout: 20000 })
    .parent()
    .find(`[url="${APP_ENDPOINTS_PATH}"]`)
    .click();
  waitForPageToBeLoaded();
  closeAllToasts();

  if (endpointHostName) {
    cy.contains(endpointHostName, { timeout: 20000 }).should('exist');
  }
};
