/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ASSIGNING_UPDATE_BUTTON } from '../screens/alerts';

export const waitForAssigneesToPopulatePopover = () => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to appear in popover');
      return cy.root().then(($el) => {
        const $updateButton = $el.find(ALERT_ASSIGNING_UPDATE_BUTTON);
        return !$updateButton.prop('disabled');
      });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForAssigneeToAppearInTable = (userName: string) => {
  cy.reload();
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to appear in the "Assignees" column');
      return cy.root().then(($el) => {
        const assigneesState = $el.find(`.euiDataGridRowCell__truncate:contains('${userName}')`);
        if (assigneesState.length > 0) {
          return true;
        }
        return false;
      });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForAssigneeToDisappearInTable = (userName: string) => {
  cy.reload();
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to disappear in the "Assignees" column');
      return cy.root().then(($el) => {
        const assigneesState = $el.find(`.euiDataGridRowCell__truncate:contains('${userName}')`);
        if (assigneesState.length > 0) {
          return false;
        }
        return true;
      });
    },
    { interval: 500, timeout: 12000 }
  );
};
