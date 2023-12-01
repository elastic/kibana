/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SecurityRoleName } from '@kbn/security-solution-plugin/common/test';
import {
  ALERTS_TABLE_ROW_LOADER,
  ALERT_AVATARS_PANEL,
  ALERT_ASSIGNEES_SELECT_PANEL,
  ALERT_ASSIGN_CONTEXT_MENU_ITEM,
  ALERT_ASSIGNEES_UPDATE_BUTTON,
  ALERT_USER_AVATAR,
  ALERT_DATA_GRID_ROW,
  ALERT_DETAILS_ASSIGN_BUTTON,
  ALERT_DETAILS_TAKE_ACTION_BUTTON,
  ALERT_UNASSIGN_CONTEXT_MENU_ITEM,
  ALERT_USERS_PROFILES_CLEAR_SEARCH_BUTTON,
  ALERT_USERS_PROFILES_SELECTABLE_MENU_ITEM,
  ALERT_ASIGNEES_COLUMN,
  ALERT_ASSIGNEES_COUNT_BADGE,
  FILTER_BY_ASSIGNEES_BUTTON,
  TAKE_ACTION_POPOVER_BTN,
  TIMELINE_CONTEXT_MENU_BTN,
} from '../screens/alerts';
import { PAGE_TITLE } from '../screens/common/page';
import { DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES } from '../screens/expandable_flyout/alert_details_right_panel';
import { selectFirstPageAlerts } from './alerts';
import { login } from './login';
import { visitWithTimeRange } from './navigation';

export const NO_ASSIGNEES = 'No assignees';

export const waitForAssigneesToPopulatePopover = () => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to appear in popover');
      return cy.root().then(($el) => {
        const $updateButton = $el.find(ALERT_ASSIGNEES_UPDATE_BUTTON);
        return !$updateButton.prop('disabled');
      });
    },
    { interval: 500, timeout: 12000 }
  );
};

export const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

export const loadPageAs = (url: string, role?: SecurityRoleName) => {
  login(role);
  visitWithTimeRange(url);
  waitForPageTitleToBeShown();
};

export const openAlertAssigningActionMenu = (alertIndex = 0) => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).eq(alertIndex).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
};

export const openAlertAssigningBulkActionMenu = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
};

export const updateAlertAssignees = () => {
  cy.get(ALERT_ASSIGNEES_UPDATE_BUTTON).click();
};

export const checkEmptyAssigneesStateInAlertsTable = () => {
  cy.get(ALERT_DATA_GRID_ROW)
    .its('length')
    .then((count) => {
      cy.get(ALERT_ASIGNEES_COLUMN).should('have.length', count);
    });
  cy.get(ALERT_ASIGNEES_COLUMN).each(($column) => {
    cy.wrap($column).within(() => {
      cy.get(ALERT_AVATARS_PANEL).children().should('have.length', 0);
    });
  });
};

export const checkEmptyAssigneesStateInAlertDetailsFlyout = () => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES).within(() => {
    cy.get(ALERT_AVATARS_PANEL).children().should('have.length', 0);
  });
};

export const alertsTableMoreActionsAreNotAvailable = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).should('not.exist');
};

export const asigneesMenuItemsAreNotAvailable = (alertIndex = 0) => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).eq(alertIndex).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).should('not.exist');
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).should('not.exist');
};

export const asigneesBulkMenuItemsAreNotAvailable = () => {
  selectFirstPageAlerts();
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).should('not.exist');
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).should('not.exist');
};

export const cannotAddAssigneesViaDetailsFlyout = () => {
  cy.get(ALERT_DETAILS_ASSIGN_BUTTON).should('be.disabled');
};

export const alertsTableShowsAssigneesForAlert = (users: SecurityRoleName[], alertIndex = 0) => {
  cy.get(ALERT_ASIGNEES_COLUMN)
    .eq(alertIndex)
    .within(() => {
      users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist'));
    });
};

export const alertsTableShowsAssigneesForAllAlerts = (users: SecurityRoleName[]) => {
  cy.get(ALERT_ASIGNEES_COLUMN).each(($column) => {
    cy.wrap($column).within(() => {
      users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist'));
    });
  });
};

export const alertsTableShowsAssigneesBadgeForAlert = (
  users: SecurityRoleName[],
  alertIndex = 0
) => {
  cy.get(ALERT_ASIGNEES_COLUMN)
    .eq(alertIndex)
    .within(() => {
      cy.get(ALERT_ASSIGNEES_COUNT_BADGE).contains(users.length);
      users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('not.exist'));
    });
};

export const alertDetailsFlyoutShowsAssignees = (users: SecurityRoleName[]) => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES).within(() => {
    users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist'));
  });
};

export const alertDetailsFlyoutShowsAssigneesBadge = (users: SecurityRoleName[]) => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES).within(() => {
    cy.get(ALERT_ASSIGNEES_COUNT_BADGE).contains(users.length);
    users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('not.exist'));
  });
};

export const selectAlertAssignee = (assignee: string) => {
  cy.get(ALERT_ASSIGNEES_SELECT_PANEL).within(() => {
    if (assignee === NO_ASSIGNEES) {
      cy.get(ALERT_USERS_PROFILES_SELECTABLE_MENU_ITEM).contains(assignee).click();
      return;
    }
    cy.get('input').type(assignee);
    cy.get(ALERT_USERS_PROFILES_SELECTABLE_MENU_ITEM).contains(assignee).click();
    cy.get(ALERT_USERS_PROFILES_CLEAR_SEARCH_BUTTON).click();
  });
};

/**
 * This will update assignees for selected alert
 * @param users The list of assugnees to update. If assignee is not assigned yet it will be assigned, otherwise it will be unassigned
 * @param alertIndex The index of the alert in the alerts table
 */
export const updateAssigneesForAlert = (users: SecurityRoleName[], alertIndex = 0) => {
  openAlertAssigningActionMenu(alertIndex);
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const updateAssigneesViaAddButtonInFlyout = (users: SecurityRoleName[]) => {
  cy.get(ALERT_DETAILS_ASSIGN_BUTTON).click();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const updateAssigneesViaTakeActionButtonInFlyout = (users: SecurityRoleName[]) => {
  cy.get(ALERT_DETAILS_TAKE_ACTION_BUTTON).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const bulkUpdateAssignees = (users: SecurityRoleName[]) => {
  openAlertAssigningBulkActionMenu();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const removeAllAssigneesForAlert = (alertIndex = 0) => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).eq(alertIndex).click();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const removeAllAssigneesViaTakeActionButtonInFlyout = () => {
  cy.get(ALERT_DETAILS_TAKE_ACTION_BUTTON).click();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const bulkRemoveAllAssignees = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
};

export const filterByAssignees = (users: Array<SecurityRoleName | typeof NO_ASSIGNEES>) => {
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).scrollIntoView();
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).click();
  users.forEach((user) => selectAlertAssignee(user));
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).click();
};

export const clearAssigneesFilter = () => {
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).scrollIntoView();
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).click();
  cy.get(ALERT_ASSIGNEES_SELECT_PANEL).within(() => {
    cy.contains('Clear filters').click();
  });
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).click();
};
