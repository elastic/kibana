/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeepReadonly } from 'utility-types';
import { EndpointManagementPageMap, getEndpointManagementPageMap } from '../../lib';

interface ListRowOptions {
  endpointId?: string;
  hostName?: string;
  row?: number;
}

const pageById: DeepReadonly<EndpointManagementPageMap> = getEndpointManagementPageMap();

export const visitEndpointList = (): Cypress.Chainable => {
  return cy.visit(pageById.endpointList.url);
};

export const getTableRow = ({
  endpointId,
  hostName,
  row = 0,
}: ListRowOptions = {}): Cypress.Chainable => {
  if (endpointId) {
    return cy.get(`[data-endpoint-id="${endpointId}"]`);
  }

  if (hostName) {
    return cy.getByTestSubj('hostnameCellLink').contains(hostName).closest('tr');
  }

  return cy.getByTestSubj('endpointListTable').find(`tr:eq(${row})`);
};

export const openRowActionMenu = (options?: ListRowOptions): Cypress.Chainable => {
  getTableRow(options).findByTestSubj('endpointTableRowActions').click();
  return cy.getByTestSubj('tableRowActionsMenuPanel');
};

export const openConsoleFromEndpointList = (options?: ListRowOptions): Cypress.Chainable => {
  openRowActionMenu(options).findByTestSubj('console').click();
};
