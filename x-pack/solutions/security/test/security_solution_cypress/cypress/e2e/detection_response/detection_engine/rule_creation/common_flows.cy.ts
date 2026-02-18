/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ruleFields } from '../../../../data/detection_engine';
import {
  ABOUT_CONTINUE_BTN,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../../screens/create_new_rule';
import {
  MAX_SIGNALS_DETAILS,
  DESCRIPTION_SETUP_GUIDE_BUTTON,
  DESCRIPTION_SETUP_GUIDE_CONTENT,
  RULE_NAME_HEADER,
} from '../../../../screens/rule_details';
import { createTimeline } from '../../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  createAndEnableRule,
  expandAdvancedSettings,
  fillCustomInvestigationFields,
  fillDescription,
  fillFalsePositiveExamples,
  fillFrom,
  fillMaxSignals,
  fillNote,
  fillReferenceUrls,
  fillRelatedIntegrations,
  fillRequiredFields,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSetup,
  fillSeverity,
  fillThreat,
  fillThreatSubtechnique,
  fillThreatTechnique,
  importSavedQuery,
  waitForAlertsToPopulate,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import { visit } from '../../../../tasks/navigation';
import { goToAlertsTab, waitForTheRuleToBeExecuted } from '../../../../tasks/rule_details';
import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../../screens/alerts';

// This test is meant to test touching all the common various components in rule creation
// to ensure we don't miss any changes that maybe affect one of these more obscure UI components
// in the creation form. For any rule type specific functionalities, please include
// them in the relevant /rule_creation/[RULE_TYPE].cy.ts test.

describe('Common rule creation flows', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    createTimeline()
      .then((response) => {
        return response.body.savedObjectId;
      })
      .as('timelineId');
    visit(CREATE_RULE_URL);
  });

  it('Creates and enables a rule', function () {
    cy.log('Filling define section');
    importSavedQuery(this.timelineId);
    fillRequiredFields();
    fillRelatedIntegrations();
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillRuleName();
    fillDescription();
    fillSeverity();
    fillRiskScore();
    fillRuleTags();
    expandAdvancedSettings();
    fillReferenceUrls();
    fillFalsePositiveExamples();
    fillThreat();
    fillThreatTechnique();
    fillThreatSubtechnique();
    fillCustomInvestigationFields();
    fillMaxSignals();
    fillNote();
    fillSetup();
    cy.get(ABOUT_CONTINUE_BTN).click();

    cy.log('Filling schedule section');
    fillFrom();

    // expect define step to repopulate
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).should('have.value', ruleFields.ruleQuery);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    // expect about step to populate
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', ruleFields.ruleName);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    createAndEnableRule();

    // UI redirects to rule creation page of a created rule
    cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);
    cy.get(MAX_SIGNALS_DETAILS).should('contain', ruleFields.maxSignals);

    cy.get(DESCRIPTION_SETUP_GUIDE_BUTTON).click();
    cy.get(DESCRIPTION_SETUP_GUIDE_CONTENT).should('contain', 'test setup markdown'); // Markdown formatting should be removed

    goToAlertsTab();
    waitForTheRuleToBeExecuted();
    waitForAlertsToPopulate();

    cy.get(ALERTS_COUNT)
      .invoke('text')
      .should('match', /^[1-9].+$/);
    cy.get(ALERT_GRID_CELL).contains(ruleFields.ruleName);
  });
});
