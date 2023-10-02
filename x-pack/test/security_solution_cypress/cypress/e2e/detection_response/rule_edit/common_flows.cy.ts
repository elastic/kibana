/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getExistingRule, getEditedRule, getMitre2, getMitre1 } from '../../../objects/rule';

import {
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_SUMMARY_BUTTON,
} from '../../../screens/common/rule_actions';
import {
  SCHEDULE_INTERVAL_AMOUNT_INPUT,
  SCHEDULE_INTERVAL_UNITS_INPUT,
} from '../../../screens/create_new_rule';
import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../../tasks/common/rule_actions';
import {
  goToAboutStepTab,
  goToActionsStepTab,
  goToScheduleStepTab,
} from '../../../tasks/rule_creation';
import { saveEditedRule, visitEditRulePage } from '../../../tasks/edit_rule';
import { login } from '../../../tasks/login';
import { expandAdvancedSettings, fillScheduleRule } from '../../../tasks/rule_creation';
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
import { CreateRulePropsRewrites } from '../../../objects/types';

describe('Common rule edit flows', { tags: ['@ess', '@serverless'] }, () => {
  const ruleEdits: CreateRulePropsRewrites<QueryRuleCreateProps> = {
    index: ['auditbeat*'],
    query: '*:*',
    name: 'Edited Rule Name',
    risk_score: 75,
    note: 'Updated investigation guide',
    author: ['New author'],
    investigation_fields: {
      field_names: ['agent.name'],
    },
    severity: 'medium',
    description: 'Edited Rule description',
    tags: [...(getExistingRule().tags || []), 'edited'],
    references: ['http://example.com/', 'https://example.com/'],
    false_positives: ['False1', 'False2'],
    threat: [getMitre1(), getMitre2()],
  };
  const editedRule = getExistingRule(ruleEdits);

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
    editRuleIndices(ruleEdits.index);
    editRuleQuery(ruleEdits.query);

    cy.log('Checking about step populates');
    goToAboutStepTab();
    confirmEditAboutStepDetails(existingRule);

    cy.log('Update about step fields');
    editRuleName(ruleEdits.name);
    editRuleDescription(ruleEdits.description);
    editSeverity(ruleEdits.severity);
    editRiskScore(ruleEdits.risk_score);
    editRuleTags(ruleEdits.tags);
    expandAdvancedSettings();
    editReferenceUrls(ruleEdits.references);
    editFalsePositiveExamples(ruleEdits.false_positives);
    editMitre(ruleEdits.threats);
    editCustomInvestigationFields(ruleEdits.investigation_fields);
    editNote(ruleEdits.note);

    cy.log('Checking schedule step populates');
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
