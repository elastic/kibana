/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepReadonly } from 'utility-types';
import { EndpointManagementPageMap, getEndpointManagementPageMap } from './page_reference';

interface ListRowOptions {
  endpointId?: string;
  hostName?: string;
  /** Zero-based row index */
  rowIndex?: number;
}

const pageById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

export const visitEndpointList = (): Cypress.Chainable => {
  return cy.visit(pageById.endpointList.url);
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
