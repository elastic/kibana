/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteRuleFromDetailsPage } from '../../../tasks/alerts_detection_rules';
import {
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
} from '../../../screens/alerts_detection_rules';
import { createRule } from '../../../tasks/api_calls/rules';
import { ruleFields } from '../../../data/detection_engine';
import { getTimeline } from '../../../objects/timeline';
import { getMitre1, getMitre2, getNewRule } from '../../../objects/rule';

import { RULE_SWITCH } from '../../../screens/rule_details';

import { createTimeline } from '../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules, deleteConnectors } from '../../../tasks/common';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../urls/rule_details';
import {
  checkRuleDetailsRuleDescription,
  checkRuleDetailsRuleSeverity,
  checkRuleDetailsRuleRiskScore,
  checkRuleDetailsRuleReferences,
  checkRuleDetailsRuleFalsePositives,
  checkRuleDetailsRuleTags,
  checkRuleDetailsRuleMitre,
  checkRuleDetailsRuleNote,
  checkQueryDetails,
  checkRuleDetailsRuleAuthor,
  checkRuleDetailsRuleIndex,
  checkRuleDetailsRuleLicense,
  checkRuleDetailsRuleName,
  checkTimelineTemplateDetails,
  confirmRuleDetailsSchedule,
} from '../../../tasks/rule_details';

// This test is meant to test all common aspects of the rule details page that should function
// the same regardless of rule type. For any rule type specific functionalities, please include
// them in the relevant /rule_details/[RULE_TYPE].cy.ts test.
describe('Common rule detail flows', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    deleteConnectors();
    login();
  });

  describe('general page functionality', () => {
    const rule = getNewRule({
      enabled: false,
      max_signals: 500,
    });

    beforeEach(() => {
      createRule(rule).then((newRule) => {
        visit(ruleDetailsUrl(newRule.body.id));
      });
    });

    it('Only modifies rule active status on enable/disable', () => {
      checkRuleDetailsRuleName(rule.name);

      cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as(
        'bulk_action'
      );
      cy.get(RULE_SWITCH).should('be.visible');
      cy.get(RULE_SWITCH).click();
      cy.wait('@bulk_action').then(({ response }) => {
        cy.wrap(response?.statusCode).should('eql', 200);
        cy.wrap(response?.body.attributes.results.updated[0].max_signals).should(
          'eql',
          rule.max_signals
        );
        cy.wrap(response?.body.attributes.results.updated[0].enabled).should('eql', true);
      });
    });

    it('Deletes one rule from detail page', () => {
      cy.intercept('POST', '/api/detection_engine/rules/_bulk_delete').as('deleteRule');

      deleteRuleFromDetailsPage();

      // @ts-expect-error update types
      cy.waitFor('@deleteRule').then(() => {
        cy.get(RULES_MANAGEMENT_TABLE).should('exist');
        cy.get(RULES_MANAGEMENT_TABLE).find(RULES_ROW).should('have.length', 0);
        cy.request({ url: '/api/detection_engine/rules/_find' }).then(({ body }) => {
          const numberOfRules = body.data.length;
          expect(numberOfRules).to.eql(0);
        });
        cy.get(CUSTOM_RULES_BTN).should('have.text', `Custom rules (${0})`);
      });
    });
  });

  describe('rule details section', () => {
    // Not using more succint utils like "confirmRuleDetailsAbout" here to be clear what
    // fields we are testing.
    it('Displays rule details', () => {
      createTimeline(getTimeline()).then((response) => {
        const ruleToCreate = getNewRule({
          rule_id: 'rule-1',
          description: ruleFields.ruleDescription,
          name: ruleFields.ruleName,
          severity: ruleFields.ruleSeverity,
          risk_score: ruleFields.riskScore,
          tags: ruleFields.ruleTags,
          false_positives: ruleFields.falsePositives,
          note: ruleFields.investigationGuide,
          timeline_id: response.body.data.persistTimeline.timeline.savedObjectId,
          timeline_title: response.body.data.persistTimeline.timeline.title ?? '',
          interval: ruleFields.ruleInterval,
          from: `now-1h`,
          query: ruleFields.ruleQuery,
          enabled: false,
          max_signals: 500,
          threat: [getMitre1(), getMitre2()],
          author: ['moi'],
          license: 'aLicense',
        });
        createRule(ruleToCreate).then((rule) => {
          visit(ruleDetailsUrl(rule.body.id));

          checkRuleDetailsRuleName(rule.body.name);

          cy.log('Checking about section details');
          checkRuleDetailsRuleDescription(rule.body.description);
          checkRuleDetailsRuleSeverity(rule.body.severity);
          checkRuleDetailsRuleRiskScore(rule.body.risk_score);
          checkRuleDetailsRuleReferences(rule.body.references);
          checkRuleDetailsRuleFalsePositives(rule.body.false_positives);
          checkRuleDetailsRuleTags(rule.body.tags);
          checkRuleDetailsRuleMitre(rule.body.threat);
          checkRuleDetailsRuleNote(rule.body.note);
          checkRuleDetailsRuleAuthor(rule.body.author);
          checkRuleDetailsRuleLicense(rule.body.license);

          cy.log('Checking definition section details');
          checkRuleDetailsRuleIndex(rule.body.index);
          checkQueryDetails(rule.body.query);
          checkTimelineTemplateDetails(rule.body.timeline_title);

          cy.log('Checking schedule section details');
          confirmRuleDetailsSchedule(rule.body);

          // TODO: Check actions details
        });
      });
    });
  });
});
