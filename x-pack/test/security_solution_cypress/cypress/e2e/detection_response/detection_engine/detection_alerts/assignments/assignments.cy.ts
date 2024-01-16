/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ROLES } from '@kbn/security-solution-plugin/common/test';
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
import { ALERTS_URL } from '../../../../../urls/navigation';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';
import {
  alertDetailsFlyoutShowsAssignees,
  alertDetailsFlyoutShowsAssigneesBadge,
  alertsTableShowsAssigneesBadgeForFirstAlert,
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
  loadPageAs,
} from '../../../../../tasks/alert_assignments';
import { ALERTS_COUNT } from '../../../../../screens/alerts';

// Failing: See https://github.com/elastic/kibana/issues/173429
describe.skip('Alert user assignment - ESS & Serverless', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });

    // Login into accounts so that they got activated and visible in user profiles list
    login(ROLES.t1_analyst);
    login(ROLES.t2_analyst);
    login(ROLES.t3_analyst);
    login(ROLES.soc_manager);
    login(ROLES.detections_admin);
    login(ROLES.platform_engineer);
  });

  after(() => {
    cy.task('esArchiverUnload', 'auditbeat_multiple');
  });

  beforeEach(() => {
    loadPageAs(ALERTS_URL);
    deleteAlertsAndRules();
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    waitForAlertsToPopulate();
  });

  context('Basic rendering', () => {
    it('alert with no assignees in alerts table', () => {
      checkEmptyAssigneesStateInAlertsTable();
    });

    it(`alert with no assignees in alert's details flyout`, () => {
      expandFirstAlert();
      checkEmptyAssigneesStateInAlertDetailsFlyout();
    });

    it('alert with some assignees in alerts table', () => {
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesForFirstAlert(users);
      alertsTableShowsAssigneesForAlert(users);
    });

    it(`alert with some assignees in alert's details flyout`, () => {
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesForFirstAlert(users);
      expandFirstAlert();
      alertDetailsFlyoutShowsAssignees(users);
    });

    it('alert with many assignees (collapsed into badge) in alerts table', () => {
      const users = [
        ROLES.t1_analyst,
        ROLES.t2_analyst,
        ROLES.t3_analyst,
        ROLES.soc_manager,
        ROLES.detections_admin,
      ];
      updateAssigneesForFirstAlert(users);
      alertsTableShowsAssigneesBadgeForFirstAlert(users);
    });

    it(`alert with many assignees (collapsed into badge) in alert's details flyout`, () => {
      const users = [ROLES.detections_admin, ROLES.t1_analyst, ROLES.t2_analyst];
      updateAssigneesForFirstAlert(users);
      expandFirstAlert();
      alertDetailsFlyoutShowsAssigneesBadge(users);
    });
  });

  context('Updating assignees (single alert)', () => {
    it('adding new assignees via `More actions` in alerts table', () => {
      // Assign users
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
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
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
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
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesViaTakeActionButtonInFlyout(users);

      // Assignees should appear in the alert's details flyout
      alertDetailsFlyoutShowsAssignees(users);

      // Assignees should appear in the alerts table
      closeAlertFlyout();
      alertsTableShowsAssigneesForAlert(users);
    });

    it('updating assignees via `More actions` in alerts table', () => {
      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesForFirstAlert(initialAssignees);
      alertsTableShowsAssigneesForAlert(initialAssignees);

      // Update assignees
      const updatedAssignees = [ROLES.t1_analyst, ROLES.t2_analyst];
      updateAssigneesForFirstAlert(updatedAssignees);

      const expectedAssignees = [ROLES.detections_admin, ROLES.t2_analyst];

      // Expected assignees should appear in the alerts table
      alertsTableShowsAssigneesForAlert(expectedAssignees);

      // Expected assignees should appear in the alert's details flyout
      expandFirstAlert();
      alertDetailsFlyoutShowsAssignees(expectedAssignees);
    });

    it('updating assignees via add button in flyout', () => {
      expandFirstAlert();

      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesViaAddButtonInFlyout(initialAssignees);
      alertDetailsFlyoutShowsAssignees(initialAssignees);

      // Update assignees
      const updatedAssignees = [ROLES.t1_analyst, ROLES.t2_analyst];
      updateAssigneesViaAddButtonInFlyout(updatedAssignees);

      const expectedAssignees = [ROLES.detections_admin, ROLES.t2_analyst];

      // Expected assignees should appear in the alert's details flyout
      alertDetailsFlyoutShowsAssignees(expectedAssignees);

      // Expected assignees should appear in the alerts table
      closeAlertFlyout();
      alertsTableShowsAssigneesForAlert(expectedAssignees);
    });

    it('updating assignees via `Take action` button in flyout', () => {
      expandFirstAlert();

      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
      updateAssigneesViaTakeActionButtonInFlyout(initialAssignees);
      alertDetailsFlyoutShowsAssignees(initialAssignees);

      // Update assignees
      const updatedAssignees = [ROLES.t1_analyst, ROLES.t2_analyst];
      updateAssigneesViaTakeActionButtonInFlyout(updatedAssignees);

      const expectedAssignees = [ROLES.detections_admin, ROLES.t2_analyst];

      // Expected assignees should appear in the alert's details flyout
      alertDetailsFlyoutShowsAssignees(expectedAssignees);

      // Expected assignees should appear in the alerts table
      closeAlertFlyout();
      alertsTableShowsAssigneesForAlert(expectedAssignees);
    });

    it('removing all assignees via `More actions` in alerts table', () => {
      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
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
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
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
    it('adding new assignees should be reflected in UI (alerts table and details flyout)', () => {
      selectFirstPageAlerts();

      // Assign users
      const users = [ROLES.detections_admin, ROLES.t1_analyst];
      bulkUpdateAssignees(users);

      // Assignees should appear in the alerts table
      alertsTableShowsAssigneesForAllAlerts(users);
    });

    it('updating assignees should be reflected in UI (alerts table and details flyout)', () => {
      selectFirstPageAlerts();

      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
      bulkUpdateAssignees(initialAssignees);
      alertsTableShowsAssigneesForAllAlerts(initialAssignees);

      // Update assignees
      selectFirstPageAlerts();
      const updatedAssignees = [ROLES.t1_analyst, ROLES.t2_analyst];
      bulkUpdateAssignees(updatedAssignees);

      const expectedAssignees = [ROLES.detections_admin, ROLES.t2_analyst];

      // Expected assignees should appear in the alerts table
      alertsTableShowsAssigneesForAllAlerts(expectedAssignees);
    });

    it('removing all assignees should be reflected in UI (alerts table and details flyout)', () => {
      selectFirstPageAlerts();

      // Initially assigned users
      const initialAssignees = [ROLES.detections_admin, ROLES.t1_analyst];
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
      bulkUpdateAssignees([ROLES.t1_analyst]);

      filterByAssignees([NO_ASSIGNEES]);

      const expectedNumberOfAlerts = totalNumberOfAlerts - numberOfSelectedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);
    });

    it('by one assignee', () => {
      const numberOfSelectedAlerts = 2;
      selectNumberOfAlerts(numberOfSelectedAlerts);
      bulkUpdateAssignees([ROLES.t1_analyst]);

      filterByAssignees([ROLES.t1_analyst]);

      cy.get(ALERTS_COUNT).contains(numberOfSelectedAlerts);
    });

    it('by multiple assignees', () => {
      const numberOfSelectedAlerts1 = 1;
      selectNumberOfAlerts(numberOfSelectedAlerts1);
      bulkUpdateAssignees([ROLES.t1_analyst]);

      filterByAssignees([NO_ASSIGNEES]);

      const numberOfSelectedAlerts2 = 2;
      selectNumberOfAlerts(numberOfSelectedAlerts2);
      bulkUpdateAssignees([ROLES.detections_admin]);

      clearAssigneesFilter();

      cy.get(ALERTS_COUNT).contains(5);

      filterByAssignees([ROLES.t1_analyst, ROLES.detections_admin]);

      const expectedNumberOfAlerts = numberOfSelectedAlerts1 + numberOfSelectedAlerts2;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAlerts);
    });

    it('by assignee and alert status', () => {
      const totalNumberOfAlerts = 5;
      const numberOfAssignedAlerts = 3;
      selectNumberOfAlerts(numberOfAssignedAlerts);
      bulkUpdateAssignees([ROLES.t1_analyst]);

      filterByAssignees([ROLES.t1_analyst]);

      const numberOfClosedAlerts = 1;
      selectNumberOfAlerts(numberOfClosedAlerts);
      closeAlerts();

      const expectedNumberOfAllerts1 = numberOfAssignedAlerts - numberOfClosedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAllerts1);

      clearAssigneesFilter();

      const expectedNumberOfAllerts2 = totalNumberOfAlerts - numberOfClosedAlerts;
      cy.get(ALERTS_COUNT).contains(expectedNumberOfAllerts2);

      filterByAssignees([ROLES.t1_analyst]);
      selectPageFilterValue(0, 'closed');
      cy.get(ALERTS_COUNT).contains(numberOfClosedAlerts);
    });
  });
});
