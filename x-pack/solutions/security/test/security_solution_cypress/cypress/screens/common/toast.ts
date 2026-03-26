/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SUCCESS_TOASTER_HEADER, TOASTER_BODY } from '../alerts_detection_rules';

export const TOAST_CLOSE_BUTTON = '[data-test-subj="toastCloseButton"]';

export const assertSuccessToast = (heading: string, msg?: string) => {
  cy.get(SUCCESS_TOASTER_HEADER).should('be.visible').should('have.text', heading);
  if (msg) {
    cy.get(TOASTER_BODY).should('be.visible').should('have.text', msg);
  }
};
