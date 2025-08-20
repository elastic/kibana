/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../../objects/rule';

import { ALERTS_COUNT } from '../../../../../screens/alerts';
import { createRule } from '../../../../../tasks/api_calls/rules';
import { goToClosedAlertsOnRuleDetailsPage } from '../../../../../tasks/alerts';
import { login } from '../../../../../tasks/login';
import {
  goToAlertsTab,
  openExceptionFlyoutFromEmptyViewerPrompt,
  visitRuleDetailsPage,
} from '../../../../../tasks/rule_details';
import {
  addExceptionFlyoutItemName,
  addExceptionEntryFieldValue,
  addExceptionEntryFieldValueValue,
  selectAddToRuleRadio,
  selectBulkCloseAlerts,
  submitNewExceptionItem,
} from '../../../../../tasks/exceptions';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import {
  NO_EXCEPTIONS_EXIST_PROMPT,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
} from '../../../../../screens/exceptions';
import { deleteExceptionLists } from '../../../../../tasks/api_calls/exceptions';

describe('Close alerts from exceptions on rule details', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
    deleteAlertsAndRules();
    deleteExceptionLists();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteExceptionLists();

    createRule(
      getNewRule({
        query: 'agent.name:*',
        index: ['exceptions*'],
        interval: '1m',
        rule_id: 'rule_testing',
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' }));
  });

  it('can close alerts', () => {
    // when no exceptions exist, empty component shows with action to add exception
    cy.get(NO_EXCEPTIONS_EXIST_PROMPT).should('exist');

    // open add exception modal
    openExceptionFlyoutFromEmptyViewerPrompt();

    // add exception item conditions
    addExceptionEntryFieldValue('agent.name', 0);
    // addExceptionEntryOperatorValue('is one of', 0);
    // addExceptionEntryFieldMatchAnyValue(['foo', 'FOO', 'bar'], 0);
    addExceptionEntryFieldValueValue('foo', 0);
    // add exception item name
    addExceptionFlyoutItemName('My item name');

    // select to add exception item to rule only
    selectAddToRuleRadio();

    // Close matching alerts
    selectBulkCloseAlerts();

    // submit
    submitNewExceptionItem();

    // new exception item displays
    cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

    // Closed alert should appear in table
    goToAlertsTab();
    goToClosedAlertsOnRuleDetailsPage();
    cy.get(ALERTS_COUNT).should('exist');
    cy.get(ALERTS_COUNT).should('have.text', '1 alert');
  });
});
