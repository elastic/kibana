/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIndexPatterns, getNewTermsRule } from '../../../objects/rule';

import { ALERT_DATA_GRID } from '../../../screens/alerts';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';

import {
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
  confirmRuleDetailsAbout,
  confirmRuleDetailsSchedule,
  confirmNewTermsRuleDetailsDefinition,
} from '../../../tasks/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineNewTermsRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectNewTermsRuleType,
} from '../../../tasks/rule_creation';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { CREATE_RULE_URL } from '../../../urls/navigation';

describe('Create new terms rules', { tags: ['@ess', '@serverless'] }, () => {
  // Fill any new terms specific values you want tested,
  // common values across rules can be tested in ./common_flows.cy.ts
  const rule = getNewTermsRule({
    query: 'host.name: *',
    index: getIndexPatterns(),
    name: 'New Terms Rule',
    description: 'The new rule description.',
    severity: 'high',
    new_terms_fields: ['host.name'],
    history_window_start: 'now-51000h',
    interval: '5m',
    from: 'now-50000h',
    max_signals: 100,
    risk_score: 17,
    tags: undefined,
    references: undefined,
    false_positives: undefined,
    threat: undefined,
    note: undefined,
  });

  before(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates and enables a new terms rule', function () {
    selectNewTermsRuleType();

    cy.log('Filling define section');
    fillDefineNewTermsRuleAndContinue(rule);

    cy.log('Filling about section');
    fillAboutRuleAndContinue(rule);

    cy.log('Filling schedule section');
    fillScheduleRuleAndContinue(rule);

    createAndEnableRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.log('Confirm alerts are generated');
    cy.get(ALERT_DATA_GRID)
      .invoke('text')
      .then((text) => {
        expect(text).contains(rule.name);
        expect(text).contains(rule.severity);
        expect(text).contains(rule.risk_score);
      });

    confirmRuleDetailsAbout(rule);
    confirmNewTermsRuleDetailsDefinition(rule);
    confirmRuleDetailsSchedule(rule);
  });
});
