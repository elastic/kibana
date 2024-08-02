/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { waitForAlertsToPopulate } from '../../../../../../tasks/create_new_rule';
import {
  addExceptionFromFirstAlert,
  goToClosedAlertsOnRuleDetailsPage,
  waitForAlerts,
} from '../../../../../../tasks/alerts';
import { deleteAlertsAndRules, postDataView } from '../../../../../../tasks/api_calls/common';
import { login } from '../../../../../../tasks/login';
import { clickDisableRuleSwitch, visitRuleDetailsPage } from '../../../../../../tasks/rule_details';
import { createRule } from '../../../../../../tasks/api_calls/rules';
import { getNewRule } from '../../../../../../objects/rule';
import { LOADING_INDICATOR } from '../../../../../../screens/security_header';
import { ALERTS_COUNT } from '../../../../../../screens/alerts';
import {
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionEntryFieldValueValue,
  addExceptionFlyoutItemName,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from '../../../../../../tasks/exceptions';

describe('Close matching Alerts ', { tags: ['@ess', '@serverless'] }, () => {
  const ITEM_NAME = 'Sample Exception Item';

  beforeEach(() => {
    deleteAlertsAndRules();

    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });

    login();
    postDataView('auditbeat-exceptions-*');
    createRule(
      getNewRule({
        query: 'agent.name:*',
        data_view_id: 'auditbeat-exceptions-*',
        interval: '1m',
        rule_id: 'rule_testing',
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id));

    waitForAlertsToPopulate();
    // Disables enabled rule
    clickDisableRuleSwitch();
    cy.get(LOADING_INDICATOR).should('not.exist');
  });
  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    deleteAlertsAndRules();
  });

  it('Should create a Rule exception item from alert actions overflow menu and close all matching alerts', () => {
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
    cy.get(LOADING_INDICATOR).should('not.exist');
    cy.get(ALERTS_COUNT).should('contain', '1');
  });
});
