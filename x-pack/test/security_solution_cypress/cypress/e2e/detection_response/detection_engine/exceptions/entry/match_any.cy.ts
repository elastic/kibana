/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewRule } from '../../../../../objects/rule';

import { RULE_STATUS } from '../../../../../screens/create_new_rule';

import { createRule } from '../../../../../tasks/api_calls/rules';
import { login } from '../../../../../tasks/login';
import {
  openExceptionFlyoutFromEmptyViewerPrompt,
  visitRuleDetailsPage,
  clickEnableRuleSwitch,
  goToAlertsTab,
} from '../../../../../tasks/rule_details';
import {
  addExceptionEntryFieldMatchAnyValue,
  addExceptionEntryFieldValue,
  addExceptionEntryOperatorValue,
  addExceptionFlyoutItemName,
  submitNewExceptionItem,
} from '../../../../../tasks/exceptions';
import { CONFIRM_BTN } from '../../../../../screens/exceptions';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { ALERTS_COUNT } from '../../../../../screens/alerts';
import { waitForAlertsToPopulate } from '../../../../../tasks/create_new_rule';

describe('Exceptions match_any', { tags: ['@ess', '@serverless'] }, () => {
  before(() => {
    // this is a made-up index that has just the necessary
    // mappings to conduct tests, avoiding loading large
    // amounts of data like in auditbeat_exceptions
    cy.task('esArchiverLoad', { archiveName: 'exceptions' });
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    createRule(
      getNewRule({
        index: ['auditbeat-exceptions-*'],
        enabled: false,
        query: '*',
        from: 'now-438300h',
      })
    ).then((rule) => visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' }));
    cy.get(RULE_STATUS).should('have.text', '—');
  });

  after(() => {
    cy.task('esArchiverUnload', { archiveName: 'exceptions' });
  });

  it('Creates exception item', () => {
    cy.log('open add exception modal');
    openExceptionFlyoutFromEmptyViewerPrompt();

    cy.log('add exception item name');
    addExceptionFlyoutItemName('My item name');

    cy.log('add match_any entry');
    addExceptionEntryFieldValue('agent.name', 0);
    // Asserting double negative because it is easier to check
    // that an alert was created than that it was NOT (as if it is not
    // it could be for other reasons, like rule failure)
    addExceptionEntryOperatorValue('is not one of', 0);
    addExceptionEntryFieldMatchAnyValue(['foo', 'FOO'], 0);
    cy.get(CONFIRM_BTN).should('be.enabled');
    submitNewExceptionItem();

    clickEnableRuleSwitch();

    goToAlertsTab();

    waitForAlertsToPopulate();

    // Will match document with value "foo" and document with value "FOO"
    cy.log('Asserting that alert is generated');
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[2].+$/);
  });
});
