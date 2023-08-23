/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { waitForAlertsToPopulate } from '../../../../tasks/create_new_rule';
import {
  addExceptionFromFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  waitForAlerts,
} from '../../../../tasks/alerts';
import { deleteAlertsAndRules, postDataView } from '../../../../tasks/common';
import { login, visitWithoutDateRange } from '../../../../tasks/login';
import { DETECTIONS_RULE_MANAGEMENT_URL } from '../../../../urls/navigation';
import { goToRuleDetails } from '../../../../tasks/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../objects/rule';
import { LOADING_INDICATOR } from '../../../../screens/security_header';
import { ALERTS_COUNT } from '../../../../screens/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from '../../../../tasks/exceptions';

// See https://github.com/elastic/kibana/issues/163967
describe('Close matching Alerts ', () => {
  const newRule = getNewRule();
  const ITEM_NAME = 'Sample Exception Item';

  beforeEach(() => {
    cy.task('esArchiverUnload', 'exceptions');
    cy.task('esArchiverResetKibana');
    deleteAlertsAndRules();
    cy.task('esArchiverLoad', 'exceptions');

    login();
    postDataView('exceptions-*');
    createRule({
      ...newRule,
      query: 'agent.name:*',
      data_view_id: 'exceptions-*',
      interval: '10s',
      rule_id: 'rule_testing',
    });
    visitWithoutDateRange(DETECTIONS_RULE_MANAGEMENT_URL);
    goToRuleDetails();
    waitForAlertsToPopulate();
  });
  after(() => {
    cy.task('esArchiverUnload', 'exceptions');
  });

  it('Should create a Rule exception item from alert actions overflow menu and close all matching alerts', () => {
    cy.get(LOADING_INDICATOR).should('not.exist');
    addExceptionFromFirstAlert();

    addExceptionEntryFieldValue('agent.name', 0);
    addExceptionEntryOperatorValue('is', 0);
    addExceptionEntryFieldValueValue('foo', 0);

    addExceptionFlyoutItemName(ITEM_NAME);
    selectBulkCloseAlerts();
    submitNewExceptionItem();

    // Instead of immediately checking if the Opened Alert has moved to the closed tab,
    // use the waitForAlerts method to create a buffer, allowing the alerts some time to
    // be moved to the Closed Alert tab.
    waitForAlerts();

    // Closed alert should appear in table
    goToClosedAlertsOnRuleDetailsPage();
    // We should not expect a specific number using should "have.text" because as the Rule is executing it is highly likely to create other
    // alerts and when the exception conditions start to close matching alerts there might be more than what was
    // before creating an exception
    cy.get(ALERTS_COUNT).should('exist');
  });
});
