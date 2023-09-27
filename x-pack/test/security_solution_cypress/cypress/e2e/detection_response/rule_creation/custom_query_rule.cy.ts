/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';
import { DEFINE_CONTINUE_BUTTON, SCHEDULE_CONTINUE_BUTTON } from '../../../screens/create_new_rule';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  fillAboutRuleMinimumAndContinue,
  createEnabledRule,
  fillDefineCustomRule,
  fillScheduleRuleAndContinue,
  fillAlertSuppression,
} from '../../../tasks/rule_creation';
import {
  confirmRuleDetailsAbout,
  confirmRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
  const rule = getNewRule({
    author: undefined,
    note: undefined,
    references: undefined,
    false_positives: undefined,
    tags: undefined,
    license: undefined,
    threat: undefined,
    severity: 'low',
    risk_score: 21,
    index: ['auditbeat-*'],
    interval: '5m',
    from: 'now-50000h',
    alert_suppression: {
      group_by: ['agent.name'],
      missing_fields_strategy: 'doNotSuppress',
    } as AlertSuppression,
  });

  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates and enables a rule', function () {
    cy.log('Filling define section');
    fillDefineCustomRule(rule);
    fillAlertSuppression(rule.alert_suppression);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillAboutRuleMinimumAndContinue(rule);

    cy.log('Filling schedule section');
    fillScheduleRuleAndContinue(rule);

    createEnabledRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.log('Confirm alerts are generated');
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[1-9].+$/);
    cy.get(ALERT_GRID_CELL).contains(rule.name);

    confirmRuleDetailsAbout(rule);
    confirmRuleDetailsDefinition(rule);
    confirmRuleDetailsSchedule(rule);
  });
});
