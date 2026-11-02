/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callOutWithId, CALLOUT_DISMISS_BTN } from '../../screens/common/callouts';

export const NEED_ADMIN_FOR_UPDATE_CALLOUT = 'need-admin-for-update-rules';
export const MISSING_PRIVILEGES_CALLOUT = 'missing-user-privileges';

export const getCallOut = (id: string, options?: Cypress.Timeoutable) => {
  return cy.get(callOutWithId(id), options);
};

export const waitForCallOutToBeShown = (id: string, color: string) => {
  getCallOut(id).should('have.class', `euiCallOut--${color}`);
};

export const dismissCallOut = (id: string, namespace = 'detections') => {
  getCallOut(id).find(CALLOUT_DISMISS_BTN).click();
  getCallOut(id).should('not.exist');

  // Wait for localStorage persistence before allowing subsequent actions (e.g., reload)
  // This prevents race conditions where the page reloads before the dismissal is persisted
  // Note: The full callout ID may include a hash suffix (e.g., 'missing-user-privileges-abc123'),
  // so we check if any dismissed ID starts with the provided id prefix
  // Storage key format: useMessagesStorage appends '-messages' to the plugin key
  const storageKey = `kibana.securitySolution.${namespace}.callouts.dismissed-messages`;
  cy.window()
    .then((win) => {
      const dismissed: string[] = JSON.parse(win.localStorage.getItem(storageKey) || '[]');
      return dismissed.some((dismissedId) => dismissedId.startsWith(id));
    })
    .should('be.true');
};
