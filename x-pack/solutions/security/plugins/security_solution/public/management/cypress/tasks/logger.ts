/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
export const logger = Object.freeze({
  info: (...data: any): Cypress.Chainable<null> => {
    return cy.task('logIt', { level: 'info', data });
  },
  debug: (...data: any): Cypress.Chainable<null> => {
    return cy.task('logIt', { level: 'info', data });
  },
  verbose: (...data: any): Cypress.Chainable<null> => {
    return cy.task('logIt', { level: 'info', data });
  },
});
