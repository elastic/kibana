/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  QueryRule,
  QueryRuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getExistingRule, getMitre2, getMitre1 } from '../../../objects/rule';

import {
  ACTIONS_NOTIFY_WHEN_BUTTON,
  ACTIONS_SUMMARY_BUTTON,
} from '../../../screens/common/rule_actions';
import { createRule } from '../../../tasks/api_calls/rules';
import { deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { addEmailConnectorAndRuleAction } from '../../../tasks/common/rule_actions';
import { login } from '../../../tasks/login';
import { expandAdvancedSettings } from '../../../tasks/rule_creation';
import {
  confirmRuleDetailsAbout,
  confirmCustomQueryRuleDetailsDefinition,
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
  confirmEditStepSchedule,
  editScheduleRule,
  goToScheduleStepTab,
  goToAboutStepTab,
  goToActionsStepTab,
  saveEditedRule,
  visitEditRulePage,
  editAuthors,
  editLicense,
} from '../../../tasks/rule_edit';
import { CreateRulePropsRewrites } from '../../../objects/types';

describe('Common rule edit flows', { tags: ['@ess', '@serverless'] }, () => {
  const originalRule = getExistingRule({ rule_id: 'rule1', enabled: false });
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
    license: 'aLicense',
  };
  const editedRule = getExistingRule(ruleEdits);

  beforeEach(() => {
    deleteConnectors();
    deleteAlertsAndRules();
    login();
    createRule<QueryRule>(originalRule).then((createdRule) => {
      visitEditRulePage(createdRule.body.id);
    });
  });

  it('Allows a rule to be edited', () => {
    cy.log('Checking define step populates');
    confirmEditDefineStepDetails(originalRule);

    cy.log('Update define step fields');
    editRuleIndices(ruleEdits.index);
    editRuleQuery(ruleEdits.query);

    cy.log('Checking about step populates');
    goToAboutStepTab();
    confirmEditAboutStepDetails(originalRule);

    cy.log('Update about step fields');
    editRuleName(ruleEdits.name);
    editRuleDescription(ruleEdits.description);
    editSeverity(ruleEdits.severity);
    editRiskScore(ruleEdits.risk_score);
    editRuleTags(ruleEdits.tags);
    expandAdvancedSettings();
    editReferenceUrls(ruleEdits.references, false);
    editFalsePositiveExamples(ruleEdits.false_positives, false);
    editMitre(ruleEdits.threat);
    editCustomInvestigationFields(ruleEdits.investigation_fields?.field_names, false);
    editNote(ruleEdits.note);
    editAuthors(ruleEdits.author, false);
    editLicense(ruleEdits.license ?? '', false);

    cy.log('Checking schedule step populates');
    goToScheduleStepTab();
    confirmEditStepSchedule(originalRule.interval);

    cy.log('Update schedule step fields');
    editScheduleRule(editedRule.interval, editedRule.from);

    cy.log('Checking actions step populates');
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
      cy.wrap(response?.body.max_signals).should('eql', originalRule.max_signals);
    });

    // Not checking withing the above await because confirming that
    // edits persisted, checking against the response would not catch
    // if an expected changed value was not persisted.
    confirmRuleDetailsAbout(editedRule);
    confirmCustomQueryRuleDetailsDefinition(editedRule);
    confirmRuleDetailsSchedule(editedRule);
    // TODO - Check actions details
  });
});
