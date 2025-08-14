/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper functions for alert assignment e2e tests
 * 
 * Enhanced with better wait conditions and timing controls to prevent flakiness:
 * - Improved popover wait logic with longer timeouts
 * - Added explicit waits after assignment operations
 * - Better element visibility and state checks
 * - Enhanced search input handling with proper clearing and waiting
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
  ALERT_ASSIGNEES_SELECTABLE_OPTIONS,
} from '../screens/alerts';
import { PAGE_TITLE } from '../screens/common/page';
import { DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES_VALUE } from '../screens/expandable_flyout/alert_details_right_panel';
import { expandFirstAlertActions, selectFirstPageAlerts } from './alerts';
import { login } from './login';
import { visitWithTimeRange } from './navigation';

export const NO_ASSIGNEES = 'No assignees';

export const waitForAssigneesToPopulatePopover = () => {
  cy.waitUntil(
    () => {
      cy.log('Waiting for assignees to appear in popover');
      return cy.root().then(($el) => {
        const $assigneesOptions = $el.find(ALERT_ASSIGNEES_SELECTABLE_OPTIONS);
        return $assigneesOptions.length > 0;
      });
    },
    { interval: 500, timeout: 20000 }
  );
  // Additional wait to ensure the options are fully rendered and clickable
  cy.get(ALERT_ASSIGNEES_SELECTABLE_OPTIONS).should('be.visible');
};

export const waitForPageTitleToBeShown = () => {
  cy.get(PAGE_TITLE).should('be.visible');
};

export const loadPageAs = (url: string, role?: SecurityRoleName) => {
  login(role);
  visitWithTimeRange(url);
  waitForPageTitleToBeShown();
};

export const openFirstAlertAssigningActionMenu = () => {
  expandFirstAlertActions();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
};

export const openAlertAssigningBulkActionMenu = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
};

export const updateAlertAssignees = () => {
  cy.get(ALERT_ASSIGNEES_UPDATE_BUTTON).click();
  // Wait for the assignment operation to complete
  cy.wait(1000);
};

export const checkEmptyAssigneesStateInAlertsTable = () => {
  // Wait for data to stabilize before checking
  cy.wait(1000);
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
  // Wait for flyout data to stabilize before checking
  cy.wait(1000);
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES_VALUE).within(() => {
    cy.get(ALERT_AVATARS_PANEL).children().should('have.length', 0);
  });
};

export const alertsTableMoreActionsAreNotAvailable = () => {
  cy.get(TIMELINE_CONTEXT_MENU_BTN).should('be.disabled');
};

export const asigneesMenuItemsAreNotAvailable = () => {
  expandFirstAlertActions();
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

export const alertsTableShowsAssigneesForAlert = (users: string[], alertIndex = 0) => {
  // Wait for data to stabilize before checking
  cy.wait(1000);
  cy.get(ALERT_ASIGNEES_COLUMN)
    .eq(alertIndex)
    .within(() => {
      users.forEach((user) => {
        cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist').should('be.visible');
      });
    });
};

export const alertsTableShowsAssigneesForAllAlerts = (users: string[]) => {
  // Wait for data to stabilize before checking
  cy.wait(1000);
  cy.get(ALERT_ASIGNEES_COLUMN).each(($column) => {
    cy.wrap($column).within(() => {
      users.forEach((user) => {
        cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist').should('be.visible');
      });
    });
  });
};

export const alertsTableShowsAssigneesBadgeForFirstAlert = (users: string[]) => {
  cy.get(ALERT_ASIGNEES_COLUMN)
    .first()
    .within(() => {
      cy.get(ALERT_ASSIGNEES_COUNT_BADGE).contains(users.length);
      users.forEach((user) => cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('not.exist'));
    });
};

export const alertDetailsFlyoutShowsAssignees = (users: string[]) => {
  // Wait for flyout data to stabilize before checking
  cy.wait(1000);
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES_VALUE).within(() => {
    users.forEach((user) => {
      cy.get(`.euiAvatar${ALERT_USER_AVATAR(user)}`).should('exist').should('be.visible');
    });
  });
};

export const alertDetailsFlyoutShowsAssigneesBadge = (users: string[]) => {
  cy.get(DOCUMENT_DETAILS_FLYOUT_HEADER_ASSIGNEES_VALUE).within(() => {
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
    cy.get('input').clear().type(assignee);
    // Wait for search results to appear
    cy.get(ALERT_USERS_PROFILES_SELECTABLE_MENU_ITEM).contains(assignee).should('be.visible');
    cy.get(ALERT_USERS_PROFILES_SELECTABLE_MENU_ITEM).contains(assignee).click();
    // Wait for selection to be processed before clearing search
    cy.wait(500);
    cy.get(ALERT_USERS_PROFILES_CLEAR_SEARCH_BUTTON).click();
  });
};

export const updateAssigneesForFirstAlert = (users: string[]) => {
  openFirstAlertAssigningActionMenu();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for assignees data to be updated in the UI
  cy.wait(2000);
};

export const updateAssigneesViaAddButtonInFlyout = (users: string[]) => {
  cy.get(ALERT_DETAILS_ASSIGN_BUTTON).click();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for assignees data to be updated in the UI
  cy.wait(2000);
};

export const updateAssigneesViaTakeActionButtonInFlyout = (users: string[]) => {
  cy.get(ALERT_DETAILS_TAKE_ACTION_BUTTON).click();
  cy.get(ALERT_ASSIGN_CONTEXT_MENU_ITEM).click();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for assignees data to be updated in the UI
  cy.wait(2000);
};

export const bulkUpdateAssignees = (users: string[]) => {
  openAlertAssigningBulkActionMenu();
  waitForAssigneesToPopulatePopover();
  users.forEach((user) => selectAlertAssignee(user));
  updateAlertAssignees();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for bulk assignees data to be updated in the UI
  cy.wait(3000);
};

export const removeAllAssigneesForFirstAlert = () => {
  expandFirstAlertActions();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for unassignment to be processed
  cy.wait(2000);
};

export const removeAllAssigneesViaTakeActionButtonInFlyout = () => {
  cy.get(ALERT_DETAILS_TAKE_ACTION_BUTTON).click();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for unassignment to be processed
  cy.wait(2000);
};

export const bulkRemoveAllAssignees = () => {
  cy.get(TAKE_ACTION_POPOVER_BTN).click();
  cy.get(ALERT_UNASSIGN_CONTEXT_MENU_ITEM).click();
  cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
  // Wait for bulk unassignment to be processed
  cy.wait(3000);
};

export const filterByAssignees = (users: Array<string | typeof NO_ASSIGNEES>) => {
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).scrollIntoView();
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).click();
  cy.get(FILTER_BY_ASSIGNEES_BUTTON).trigger('mouseleave');
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
