/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_BASE_PATH } from '@kbn/fleet-plugin/public/constants';

export const visitFleetAgentList = (): Cypress.Chainable => {
  // `failOnStatus` below is necesary because the page (when not accessible) will actually return
  // a `4xx` error along with an HTML page to display.
  return cy.visit(FLEET_BASE_PATH, { failOnStatusCode: false });
};

export const getFleetAgentListTable = (): Cypress.Chainable => {
  return cy.getByTestSubj('fleetAgentListTable');
};
