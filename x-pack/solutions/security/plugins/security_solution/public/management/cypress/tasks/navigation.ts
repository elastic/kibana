/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadPage } from './common';

export const INTEGRATIONS = 'app/integrations#/';
export const FLEET = 'app/fleet/';

export const navigateTo = (page: string, opts?: Partial<Cypress.VisitOptions>) => {
  loadPage(page, opts);
  cy.contains('Loading Elastic').should('exist');
  cy.contains('Loading Elastic').should('not.exist');

  // There's a security warning toast that seemingly makes ui elements in the bottom right unavailable, so we close it
  cy.get('[data-test-subj="toastCloseButton"]', { timeout: 30000 }).click();
};
