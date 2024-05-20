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
import { visitRuleDetailsPage } from '../../../../../../tasks/rule_details';
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

// TODO: https://github.com/elastic/kibana/issues/161539
// See https://github.com/elastic/kibana/issues/163967
describe('Close matching Alerts ', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  const ITEM_NAME = 'Sample Exception Item';

  beforeEach(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    deleteAlertsAndRules();
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });

    login();
    postDataView('exceptions-*');
    createRule(
      getNewRule({
        query: 'agent.name:*',
        data_view_id: 'exceptions-*',
        interval: '10s',
        rule_id: 'rule_testing',
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id));

    waitForAlertsToPopulate();
  });
  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
  });

  // TODO: https://github.com/elastic/kibana/issues/161539
  it.skip('Should create a Rule exception item from alert actions overflow menu and close all matching alerts', () => {
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
