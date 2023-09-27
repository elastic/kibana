/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExistingRule, getEditedRule } from '../../../objects/rule';

import {
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_SUMMARY_BUTTON,
} from '../../../screens/common/rule_actions';
import {
  CUSTOM_QUERY_INPUT,
  DEFINE_INDEX_INPUT,
  DEFAULT_RISK_SCORE_INPUT,
  RULE_DESCRIPTION_INPUT,
  RULE_NAME_INPUT,
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
  SEVERITY_DROPDOWN,
  TAGS_CLEAR_BUTTON,
  TAGS_FIELD,
} from '../../../screens/create_new_rule';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_TOGGLE,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../../tasks/common/rule_actions';
import {
  fillAboutRule,
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
} from '../../../tasks/create_new_rule';
import { saveEditedRule, visitEditRulePage } from '../../../tasks/edit_rule';
import { login } from '../../../tasks/login';
import {
  expandAdvancedSettings,
  fillCustomInvestigationFields,
  fillDescription,
  fillFalsePositiveExamples,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
  fillThreat,
  fillThreatSubtechnique,
  fillThreatTechnique,
  fillScheduleRule,
} from '../../../tasks/rule_creation';
import {
  confirmRuleDetailsAbout,
  confirmRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import {
  editCustomInvestigationFields,
  editFalsePositiveExamples,
  editMitre,
  editNote,
  editReferenceUrls,
  editRiskScore,
  editRuleDescription,
  editRuleName,
  editRuleTags,
  editSeverity,
  confirmEditAboutStepDetails,
  confirmEditDefineStepDetails,
  editRuleIndices,
  editRuleQuery,
} from '../../../tasks/rule_edit';

describe('Common rule edit flows', { tags: ['@ess', '@serverless'] }, () => {
  const editedRule = getEditedRule();

  beforeEach(() => {
    deleteConnectors();
    deleteAlertsAndRules();
    login();
    createRule(getExistingRule({ rule_id: 'rule1', enabled: true })).then((createdRule) => {
      visitEditRulePage(createdRule.body.id);
    });
  });

  it('Allows a rule to be edited', () => {
    const existingRule = getExistingRule();

    cy.log('Checking define step populates');
    confirmEditDefineStepDetails(existingRule);

    cy.log('Update define step fields');
    editRuleIndices(editedRule.index);
    editRuleQuery(editedRule.query);

    cy.log('Checking about step populates');
    goToAboutStepTab();
    confirmEditAboutStepDetails(existingRule);

    cy.log('Update about step fields');
    editRuleName(editedRule.name);
    editRuleDescription(editedRule.description);
    editSeverity(editedRule.severity);
    editRiskScore(editedRule.risk_score);
    editRuleTags(editedRule.tags);
    expandAdvancedSettings();
    editReferenceUrls(editedRule.references);
    editFalsePositiveExamples(editedRule.false_positives);
    editMitre(editedRule.threats);
    editCustomInvestigationFields(editedRule.investigation_fields);
    editNote(editedRule.note);

    cy.log('Checking about step populates');
    goToScheduleStepTab();
    const interval = existingRule.interval;
    const intervalParts = interval != null && interval.match(/[0-9]+|[a-zA-Z]+/g);
    if (intervalParts) {
      const [amount, unit] = intervalParts;
      cy.get(SCHEDULE_INTERVAL_AMOUNT_INPUT).invoke('val').should('eql', amount);
      cy.get(SCHEDULE_INTERVAL_UNITS_INPUT).invoke('val').should('eql', unit);
    } else {
      throw new Error('Cannot assert scheduling info on a rule without an interval');
    }

    cy.log('Update schedule step fields');
    fillScheduleRule(editedRule);

    goToActionsStepTab();

    cy.log('Update actions step fields');
    addEmailConnectorAndRuleAction('test@example.com', 'Subject');

    cy.get(ACTIONS_SUMMARY_BUTTON).should('have.text', 'Summary of alerts');
    cy.get(ACTIONS_NOTIFY_WHEN_BUTTON).should('have.text', 'Per rule run');

    cy.log('Asserting changing tabs does not reset fields, previous known bug');
    goToAboutStepTab();
    confirmEditAboutStepDetails(editedRule);

    cy.log('Saving updates');
    cy.intercept('GET', '/api/detection_engine/rules?id*').as('getRule');
    saveEditedRule();

    cy.wait('@getRule').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      // ensure that editing rule does not modify max_signals
      cy.wrap(response?.body.max_signals).should('eql', existingRule.max_signals);
    });

    confirmRuleDetailsAbout(editedRule);
    confirmRuleDetailsDefinition(editedRule);
    confirmRuleDetailsSchedule(editedRule);
  });
});
