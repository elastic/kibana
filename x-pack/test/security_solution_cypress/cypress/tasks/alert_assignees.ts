/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ASSIGNING_UPDATE_BUTTON } from '../screens/alerts';

export const waitForAssigneesToPopulate = () => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to appear');
      return cy.root().then(($el) => {
        const $updateButton = $el.find(ALERT_ASSIGNING_UPDATE_BUTTON);
        return !$updateButton.prop('disabled');
      });
    },
    { interval: 500, timeout: 12000 }
  );
};
