/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../objects/rule';
import {
  clickAlertAssignee,
  findSelectedAlertAssignee,
  findUnselectedAlertAssignee,
  openAlertAssigningBulkActionMenu,
  selectNumberOfAlerts,
  updateAlertAssignees,
} from '../../tasks/alerts';
import { createRule } from '../../tasks/api_calls/rules';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import { login } from '../../tasks/login';
import { visitWithTimeRange } from '../../tasks/navigation';
import { ALERTS_URL } from '../../urls/navigation';
import { waitForAlertsToPopulate } from '../../tasks/create_new_rule';
import { ALERTS_TABLE_ROW_LOADER } from '../../screens/alerts';
import { waitForAssigneesToPopulate } from '../../tasks/alert_assignees';

// TODO: https://github.com/elastic/kibana/issues/161539
describe('Alert assigning', { tags: ['@ess', '@serverless', '@brokenInServerless'] }, () => {
  before(() => {
    cleanKibana();
    cy.task('esArchiverResetKibana');
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    cy.task('esArchiverLoad', { archiveName: 'endpoint' });
    createRule(getNewRule({ rule_id: 'new custom rule' }));
    visitWithTimeRange(ALERTS_URL);
    waitForAlertsToPopulate();
  });

  afterEach(() => {
    cy.task('esArchiverUnload', 'endpoint');
  });

  it('Add and remove an assignee using the alert bulk action menu', () => {
    // Add an assignee to one alert
    selectNumberOfAlerts(1);
    openAlertAssigningBulkActionMenu();
    clickAlertAssignee('elastic');
    updateAlertAssignees();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    selectNumberOfAlerts(1);
    openAlertAssigningBulkActionMenu();
    waitForAssigneesToPopulate();
    findSelectedAlertAssignee('elastic');
    // Remove assignee from that alert
    clickAlertAssignee('elastic');
    updateAlertAssignees();
    cy.get(ALERTS_TABLE_ROW_LOADER).should('not.exist');
    selectNumberOfAlerts(1);
    openAlertAssigningBulkActionMenu();
    waitForAssigneesToPopulate();
    findUnselectedAlertAssignee('elastic');
  });
});
