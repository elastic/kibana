/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  DEFINE_CONTINUE_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../screens/rule_creation';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillDescription,
  fillRiskScore,
  fillRuleName,
  fillSeverity,
  fillTimestampOverride,
  fillSeverityOverride,
  fillRiskOverride,
  fillRuleNameOverride,
  expandAdvancedSettings,
  fillRulCustomQuery,
} from '../../../tasks/rule_creation';
import { login } from '../../../tasks/login';
import { CREATE_RULE_URL } from '../../../urls/navigation';
import { visit } from '../../../tasks/navigation';
import {
  checkRuleDetailsRuleDescription,
  checkRuleDetailsRuleNameOverride,
  checkRuleDetailsRuleRiskScore,
  checkRuleDetailsRuleRiskScoreOverride,
  checkRuleDetailsRuleSeverity,
  checkRuleDetailsRuleSeverityOverride,
  checkRuleDetailsRuleTimestampOverride,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/rule_details';
import {
  getNewRule,
  getSeverityOverride1,
  getSeverityOverride2,
  getSeverityOverride3,
  getSeverityOverride4,
} from '../../../objects/rule';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../screens/alerts';

describe('Common rule creation override field flows', { tags: ['@ess', '@serverless'] }, () => {
  // Explicitly listing out properties to be tested
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
    severity_mapping: [
      getSeverityOverride1(),
      getSeverityOverride2(),
      getSeverityOverride3(),
      getSeverityOverride4(),
    ],
    risk_score_mapping: [
      { field: 'destination.port', value: '', operator: 'equals', risk_score: undefined },
    ],
    rule_name_override: 'agent.name',
    timestamp_override: 'event.start',
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates a rule with overrides', () => {
    cy.log('Filling define section');
    fillRulCustomQuery(rule.query);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    // Explicitly listing out properties to be tested instead
    // of using a util like "fillAboutRuleWithOverrideAndContinue"
    fillRuleName(rule.name);
    fillDescription(rule.description);
    fillSeverity(rule.severity);
    fillSeverityOverride(rule.severity_mapping);
    fillRiskScore(rule.risk_score);
    fillRiskOverride(rule.risk_score_mapping);
    expandAdvancedSettings();
    fillRuleNameOverride(rule.rule_name_override);
    fillTimestampOverride(rule.timestamp_override);
    cy.get(ABOUT_CONTINUE_BTN).click();

    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    cy.log('expect about step to repopulate');
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', rule.name);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    createAndEnableRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[1-9].+$/); // Any number of alerts
    cy.get(ALERT_GRID_CELL).contains('auditbeat');
    cy.get(ALERT_GRID_CELL).contains('critical');
    cy.get(ALERT_GRID_CELL).contains('80');

    // Explicitly listing out properties to be tested instead
    // of using a util like "export const confirmRuleDetailsAbout
    checkRuleDetailsRuleDescription(rule.description);
    checkRuleDetailsRuleSeverity(rule.severity);
    checkRuleDetailsRuleRiskScore(rule.risk_score);
    checkRuleDetailsRuleSeverityOverride(rule.severity_mapping);
    checkRuleDetailsRuleRiskScoreOverride(rule.risk_score_mapping);
    checkRuleDetailsRuleTimestampOverride(rule.timestamp_override);
    checkRuleDetailsRuleNameOverride(rule.rule_name_override);
  });
});
