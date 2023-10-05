/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTimeline } from '../../../objects/timeline';

import {
  ABOUT_CONTINUE_BTN,
  ABOUT_EDIT_BUTTON,
  CUSTOM_QUERY_INPUT,
  DEFINE_CONTINUE_BUTTON,
  DEFINE_EDIT_BUTTON,
  RULE_NAME_INPUT,
  SCHEDULE_CONTINUE_BUTTON,
} from '../../../screens/rule_creation';
import { RULE_NAME_HEADER } from '../../../screens/rule_details';
import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules } from '../../../tasks/common';
import {
  createDisabledRule,
  expandAdvancedSettings,
  fillCustomInvestigationFields,
  fillDescription,
  fillFalsePositiveExamples,
  fillScheduleRule,
  fillMitre,
  fillNote,
  fillReferenceUrls,
  fillRiskScore,
  fillRuleName,
  fillRuleTags,
  fillSeverity,
  fillAuthor,
  fillTimelineTemplate,
  importSavedQuery,
  fillLicense,
} from '../../../tasks/rule_creation';
import { login } from '../../../tasks/login';
import { CREATE_RULE_URL } from '../../../urls/navigation';
import { visit } from '../../../tasks/navigation';
import {
  confirmRuleDetailsAbout,
  confirmRuleDetailsDefinition,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';
import { getMitre1, getMitre2, getNewRule } from '../../../objects/rule';

// This test is meant to test touching all the common various components in rule creation
// to ensure we don't miss any changes that maybe affect one of these more obscure UI components
// in the creation form. For any rule type specific functionalities, please include
// them in the relevant /rule_creation/[RULE_TYPE].cy.ts test.
describe('Common rule creation flows', { tags: ['@ess', '@serverless'] }, () => {
  // Explicitly listing out properties to be tested
  const rule = getNewRule({
    type: 'query',
    query: 'host.name: *',
    index: ['auditbeat-*'],
    name: 'New Rule Test',
    description: 'The new rule description.',
    severity: 'high',
    risk_score: 17,
    tags: ['test', 'newRule'],
    references: ['http://example.com/', 'https://example.com/'],
    false_positives: ['False1', 'False2'],
    threat: [getMitre1(), getMitre2()],
    note: 'test investigation guide',
    interval: '100m',
    from: 'now-50000h',
    max_signals: 100,
    timeline_title: 'Comprehensive Process Timeline',
    author: ['moi'],
    license: 'aLicense',
  });
  beforeEach(() => {
    deleteAlertsAndRules();
    createTimeline(getTimeline())
      .then((response) => {
        return response.body.data.persistTimeline.timeline.savedObjectId;
      })
      .as('timelineId');
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates a rule', function () {
    cy.log('Filling define section');
    importSavedQuery(this.timelineId);
    fillTimelineTemplate(rule);
    cy.get(DEFINE_CONTINUE_BUTTON).click();

    cy.log('Filling about section');
    fillRuleName(rule.name);
    fillDescription(rule.description);
    fillSeverity(rule.severity);
    fillRiskScore(rule.risk_score);
    fillRuleTags(rule.tags);
    expandAdvancedSettings();
    fillReferenceUrls(rule.references);
    fillFalsePositiveExamples(rule.false_positives);
    fillMitre(rule.threat);
    fillCustomInvestigationFields(rule.investigation_fields?.field_names);
    fillNote(rule.note);
    fillAuthor(rule.author);
    fillLicense(rule.license);
    cy.get(ABOUT_CONTINUE_BTN).click();

    cy.log('Filling schedule section');
    fillScheduleRule(rule.interval, rule.from);
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    cy.log('expect define step to repopulate');
    cy.get(DEFINE_EDIT_BUTTON).click();
    cy.get(CUSTOM_QUERY_INPUT).should('have.value', rule.query);
    cy.get(DEFINE_CONTINUE_BUTTON).should('exist').click();

    cy.log('expect about step to repopulate');
    cy.get(ABOUT_EDIT_BUTTON).click();
    cy.get(RULE_NAME_INPUT).invoke('val').should('eql', rule.name);
    cy.get(ABOUT_CONTINUE_BTN).should('exist').click();
    cy.get(SCHEDULE_CONTINUE_BUTTON).click();

    createDisabledRule();

    cy.get(RULE_NAME_HEADER).should('contain', rule.name);

    confirmRuleDetailsAbout(rule);
    confirmRuleDetailsDefinition(rule);
    confirmRuleDetailsSchedule(rule);
  });
});
