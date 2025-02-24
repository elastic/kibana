/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The screen normally returned by the API when a user does not have access to a Plugin.
 * Note that the requested page will likely also receive an HTTP status code of `403`
 */
export const ensureFleetPermissionDeniedScreen = (): Cypress.Chainable => {
  return cy.contains('You do not have permission to access the requested page').should('exist');
};
