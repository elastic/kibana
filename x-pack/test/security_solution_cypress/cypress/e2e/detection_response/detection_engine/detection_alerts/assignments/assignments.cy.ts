/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { visitWithTimeRange } from '../../../../../tasks/navigation';
import { getNewRule } from '../../../../../objects/rule';
import {
  closeAlertFlyout,
  closeAlerts,
  expandFirstAlert,
  selectFirstPageAlerts,
  selectNumberOfAlerts,
  selectPageFilterValue,
} from '../../../../../tasks/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { login } from '../../../../../tasks/login';
import { getPlatformEngineerUsername } from '../../../../../tasks/common/users';
import { ALERTS_URL } from '../../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  alertDetailsFlyoutShowsAssignees,
  alertsTableShowsAssigneesForAlert,
  updateAssigneesForFirstAlert,
  checkEmptyAssigneesStateInAlertDetailsFlyout,
  checkEmptyAssigneesStateInAlertsTable,
  removeAllAssigneesForFirstAlert,
  bulkUpdateAssignees,
  alertsTableShowsAssigneesForAllAlerts,
  bulkRemoveAllAssignees,
  filterByAssignees,
  NO_ASSIGNEES,
  clearAssigneesFilter,
  updateAssigneesViaAddButtonInFlyout,
  updateAssigneesViaTakeActionButtonInFlyout,
  removeAllAssigneesViaTakeActionButtonInFlyout,
} from '../../../../../tasks/alert_assignments';
import { ALERTS_COUNT } from '../../../../../screens/alerts';

// FLAKY: https://github.com/elastic/kibana/issues/183787
describe('Alert user assignment - ESS & Serverless', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  context('Basic rendering', () => {
    it('alert with no assignees in alerts table & details flyout', () => {
      checkEmptyAssigneesStateInAlertsTable();

      expandFirstAlert();
      checkEmptyAssigneesStateInAlertDetailsFlyout();
    });

    it('alert with some assignees in alerts table & details flyout', () => {
      const users = [getPlatformEngineerUsername()];
      updateAssigneesForFirstAlert(users);

      alertsTableShowsAssigneesForAlert(users);

      expandFirstAlert();
      alertDetailsFlyoutShowsAssignees(users);
    });
  });

  context('Updating assignees (single alert)', () => {
    it('adding new assignees via `More actions` in alerts table', () => {
      // Assign users
      const users = [getPlatformEngineerUsername()];
      updateAssigneesForFirstAlert(users);

      // Assignees should appear in the alerts table
      alertsTableShowsAssigneesForAlert(users);

      // Assignees should appear in the alert's details flyout
      expandFirstAlert();
      alertDetailsFlyoutShowsAssignees(users);
    });

    it('adding new assignees via add button in flyout', () => {
      expandFirstAlert();

      // Assign users
      const users = [getPlatformEngineerUsername()];
      updateAssigneesViaAddButtonInFlyout(users);

      // Assignees should appear in the alert's details flyout
      alertDetailsFlyoutShowsAssignees(users);

      // Assignees should appear in the alerts table
      closeAlertFlyout();
      alertsTableShowsAssigneesForAlert(users);
    });

    it('adding new assignees via `Take action` button in flyout', () => {
      expandFirstAlert();

      // Assign users
      const users = [getPlatformEngineerUsername()];
      updateAssigneesViaTakeActionButtonInFlyout(users);

      // Assignees should appear in the alert's details flyout
      alertDetailsFlyoutShowsAssignees(users);

      // Assignees should appear in the alerts table
      closeAlertFlyout();
      alertsTableShowsAssigneesForAlert(users);
    });

    it('removing all assignees via `More actions` in alerts table', () => {
      // Initially assigned users
      const initialAssignees = [getPlatformEngineerUsername()];
      updateAssigneesForFirstAlert(initialAssignees);
      alertsTableShowsAssigneesForAlert(initialAssignees);

      removeAllAssigneesForFirstAlert();

      // Alert should not show any assignee in alerts table or in details flyout
      checkEmptyAssigneesStateInAlertsTable();
      expandFirstAlert();
      checkEmptyAssigneesStateInAlertDetailsFlyout();
    });

    it('removing all assignees via `Take action` button in flyout', () => {
      expandFirstAlert();

      // Initially assigned users
      const initialAssignees = [getPlatformEngineerUsername()];
      updateAssigneesViaTakeActionButtonInFlyout(initialAssignees);
      alertDetailsFlyoutShowsAssignees(initialAssignees);

      removeAllAssigneesViaTakeActionButtonInFlyout();

      // Alert should not show any assignee in alerts table or in details flyout
      checkEmptyAssigneesStateInAlertDetailsFlyout();
      closeAlertFlyout();
      checkEmptyAssigneesStateInAlertsTable();
    });
  });

  context('Updating assignees (bulk actions)', () => {
    it('adding new assignees should be reflected in UI (alerts table)', () => {
      selectFirstPageAlerts();

      // Assign users
      const users = [getPlatformEngineerUsername()];
      bulkUpdateAssignees(users);

      // Assignees should appear in the alerts table
      alertsTableShowsAssigneesForAllAlerts(users);
    });

    it('removing all assignees should be reflected in UI (alerts table)', () => {
      selectFirstPageAlerts();

      // Initially assigned users
      const initialAssignees = [getPlatformEngineerUsername()];
      bulkUpdateAssignees(initialAssignees);
      alertsTableShowsAssigneesForAllAlerts(initialAssignees);

      // Unassign alert
      selectFirstPageAlerts();
      bulkRemoveAllAssignees();

      // Alerts should not have assignees
      checkEmptyAssigneesStateInAlertsTable();
    });
  });

  context('Alerts filtering', () => {
    it('by `No assignees` option', () => {
      const totalNumberOfAlerts = 5;
      const numberOfSelectedAlerts = 2;
      selectNumberOfAlerts(numberOfSelectedAlerts);
      bulkUpdateAssignees([getPlatformEngineerUsername()]);

      filterByAssignees([NO_ASSIGNEES]);

      const expectedNumberOfAlerts = totalNumberOfAlerts - numberOfSelectedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);
    });

    it('by one assignee', () => {
      const numberOfSelectedAlerts = 2;
      selectNumberOfAlerts(numberOfSelectedAlerts);
      bulkUpdateAssignees([getPlatformEngineerUsername()]);

      filterByAssignees([getPlatformEngineerUsername()]);

      cy.get(ALERTS_COUNT).contains(numberOfSelectedAlerts);
    });

    it('by assignee and alert status', () => {
      const totalNumberOfAlerts = 5;
      const numberOfAssignedAlerts = 3;
      selectNumberOfAlerts(numberOfAssignedAlerts);
      bulkUpdateAssignees([getPlatformEngineerUsername()]);

      filterByAssignees([getPlatformEngineerUsername()]);

      const numberOfClosedAlerts = 1;
      selectNumberOfAlerts(numberOfClosedAlerts);
      closeAlerts();

      const expectedNumberOfAllerts1 = numberOfAssignedAlerts - numberOfClosedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAllerts1);

      clearAssigneesFilter();

      const expectedNumberOfAllerts2 = totalNumberOfAlerts - numberOfClosedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAllerts2);

      filterByAssignees([getPlatformEngineerUsername()]);
      selectPageFilterValue(0, 'closed');
      cy.get(ALERTS_COUNT).contains(numberOfClosedAlerts);
    });
  });
});
