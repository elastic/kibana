/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertSuppression } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getDataViewRule, getNewRule } from '../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';
import { DEFINE_CONTINUE_BUTTON } from '../../../screens/rule_creation';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { deleteAlertsAndRules, postDataView } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import {
  fillAboutRuleMinimumAndContinue,
  createAndEnableRule,
  fillDefineCustomRule,
  fillScheduleRuleAndContinue,
  fillAlertSuppression,
  fillRuleDataView,
  fillRulCustomQuery,
} from '../../../tasks/rule_creation';
import {
  confirmRuleDetailsAbout,
  confirmCustomQueryRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';
import { CREATE_RULE_URL } from '../../../urls/navigation';

describe('Create custom query rule', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
  });

  it('Creates and enables a rule', function () {
    visit(CREATE_RULE_URL);

    const alertSuppressionOptions = {
      group_by: ['agent.name'],
      missing_fields_strategy: 'doNotSuppress',
    } as AlertSuppression;
    // Fill any custom query specific values you want tested,
    // common values across rules can be tested in ./common_flows.cy.ts
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
      alert_suppression: alertSuppressionOptions,
    });

    cy.log('Filling define section');
    fillDefineCustomRule(rule);
    fillAlertSuppression(alertSuppressionOptions);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillAboutRuleMinimumAndContinue(rule);

    cy.log('Filling schedule section');
    fillScheduleRuleAndContinue(rule);

    createAndEnableRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.log('Confirm alerts are generated');
    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[1-9].+$/);
    cy.get(ALERT_GRID_CELL).contains(rule.name);

    confirmRuleDetailsAbout(rule);
    confirmCustomQueryRuleDetailsDefinition(rule);
    confirmRuleDetailsSchedule(rule);
  });

  describe('with data view', () => {
    const rule = getDataViewRule({
      query: 'host.name: *',
      data_view_id: 'auditbeat-2022',
      name: 'New Data View Rule',
    });

    beforeEach(() => {
      /* We don't call cleanKibana method on the before hook, instead we call esArchiverReseKibana on the before each. This is because we
      are creating a data view we'll use after and cleanKibana does not delete all the data views created, esArchiverReseKibana does.
      We don't use esArchiverReseKibana in all the tests because is a time-consuming method and we don't need to perform an exhaustive
      cleaning in all the other tests. */
      cy.task('esArchiverResetKibana');
      if (rule.data_view_id != null) {
        postDataView(rule.data_view_id);
      }
    });

    it('Creates and enables a new rule', function () {
      visit(CREATE_RULE_URL);

      cy.log('Filling define section');
      fillRuleDataView(rule.data_view_id);
      fillRulCustomQuery(rule.query);
      cy.get(DEFINE_CONTINUE_BUTTON).click();

      cy.log('Filling about section');
      fillAboutRuleMinimumAndContinue(rule);

      cy.log('Filling schedule section');
      fillScheduleRuleAndContinue(rule);

      createAndEnableRule();

      cy.get(RULE_NAME_HEADER).should('contain', rule.name);

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.log('Confirm alerts are generated');
      cy.get(ALERTS_COUNT)
        .invoke('text')
        .should('match', /^[1-9].+$/);
      cy.get(ALERT_GRID_CELL).contains(rule.name);

      confirmRuleDetailsAbout(rule);
      confirmCustomQueryRuleDetailsDefinition(rule);
      confirmRuleDetailsSchedule(rule);
    });
  });
});
