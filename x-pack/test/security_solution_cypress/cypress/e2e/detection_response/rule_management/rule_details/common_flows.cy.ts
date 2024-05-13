/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteRuleFromDetailsPage } from '../../../../tasks/alerts_detection_rules';
import {
  CUSTOM_RULES_BTN,
  RULES_MANAGEMENT_TABLE,
  RULES_ROW,
} from '../../../../screens/alerts_detection_rules';
import { createRule } from '../../../../tasks/api_calls/rules';
import { getDetails } from '../../../../tasks/rule_details';
import { ruleFields } from '../../../../data/detection_engine';
import { getExistingRule, getNewRule } from '../../../../objects/rule';

import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  REFERENCE_URLS_DETAILS,
  removeExternalLinkText,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_SWITCH,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  THREAT_SUBTECHNIQUE,
  THREAT_TACTIC,
  THREAT_TECHNIQUE,
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../../screens/rule_details';

import { createTimeline } from '../../../../tasks/api_calls/timelines';
import { deleteAlertsAndRules, deleteConnectors } from '../../../../tasks/api_calls/common';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { ruleDetailsUrl } from '../../../../urls/rule_details';

// This test is meant to test all common aspects of the rule details page that should function
// the same regardless of rule type. For any rule type specific functionalities, please include
// them in the relevant /rule_details/[RULE_TYPE].cy.ts test.
describe('Common rule detail flows', { tags: ['@ess', '@serverless'] }, function () {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteConnectors();
    createTimeline().then((response) => {
      createRule({
        ...getNewRule({
          rule_id: 'rulez',
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
          threat: [
            {
              ...ruleFields.threat,
              technique: [
                {
                  ...ruleFields.threatTechnique,
                  subtechnique: [ruleFields.threatSubtechnique],
                },
              ],
            },
          ],
        }),
      }).then((rule) => {
        cy.wrap(rule.body.id).as('ruleId');
      });
    });
  });

  it('Only modifies rule active status on enable/disable', function () {
    visit(ruleDetailsUrl(this.ruleId));
    cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);

    cy.intercept('POST', '/api/detection_engine/rules/_bulk_action?dry_run=false').as(
      'bulk_action'
    );
    cy.get(RULE_SWITCH).should('be.visible');
    cy.get(RULE_SWITCH).click();
    cy.wait('@bulk_action').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.wrap(response?.body.attributes.results.updated[0].max_signals).should(
        'eql',
        getExistingRule().max_signals
      );
      cy.wrap(response?.body.attributes.results.updated[0].enabled).should('eql', true);
    });
  });

  it('Displays rule details', function () {
    visit(ruleDetailsUrl(this.ruleId));
    cy.get(RULE_NAME_HEADER).should('contain', ruleFields.ruleName);
    cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', ruleFields.ruleDescription);
    cy.get(ABOUT_DETAILS).within(() => {
      getDetails(SEVERITY_DETAILS)
        .invoke('text')
        .then((text) => {
          cy.wrap(text.toLowerCase()).should('equal', ruleFields.ruleSeverity);
        });
      getDetails(RISK_SCORE_DETAILS).should('have.text', ruleFields.riskScore);
      getDetails(REFERENCE_URLS_DETAILS).should((details) => {
        expect(removeExternalLinkText(details.text())).equal(ruleFields.referenceUrls.join(''));
      });
      getDetails(FALSE_POSITIVES_DETAILS).should('have.text', ruleFields.falsePositives.join(''));
      getDetails(TAGS_DETAILS).should('have.text', ruleFields.ruleTags.join(''));
    });
    cy.get(THREAT_TACTIC).should(
      'contain',
      `${ruleFields.threat.tactic.name} (${ruleFields.threat.tactic.id})`
    );
    cy.get(THREAT_TECHNIQUE).should(
      'contain',
      `${ruleFields.threatTechnique.name} (${ruleFields.threatTechnique.id})`
    );
    cy.get(THREAT_SUBTECHNIQUE).should(
      'contain',
      `${ruleFields.threatSubtechnique.name} (${ruleFields.threatSubtechnique.id})`
    );
    cy.get(INVESTIGATION_NOTES_TOGGLE).click();
    cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
    cy.get(DEFINITION_DETAILS).within(() => {
      getDetails(INDEX_PATTERNS_DETAILS).should(
        'have.text',
        ruleFields.defaultIndexPatterns.join('')
      );
      getDetails(CUSTOM_QUERY_DETAILS).should('have.text', ruleFields.ruleQuery);
      getDetails(RULE_TYPE_DETAILS).should('have.text', 'Query');
      getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'Security Timeline');
    });
    cy.get(SCHEDULE_DETAILS).within(() => {
      getDetails(RUNS_EVERY_DETAILS).should('have.text', ruleFields.ruleInterval);
      getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', '55m');
    });
  });

  it('Deletes one rule from detail page', function () {
    visit(ruleDetailsUrl(this.ruleId));
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
