/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../../helpers/rules';
import { getIndexPatterns, getNewThresholdRule } from '../../../../objects/rule';

import { ALERTS_COUNT, ALERT_GRID_CELL } from '../../../../screens/alerts';

import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  RULE_SWITCH,
  SEVERITY,
} from '../../../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  FALSE_POSITIVES_DETAILS,
  DEFINITION_DETAILS,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  THRESHOLD_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  SUPPRESS_FOR_DETAILS,
  INTERVAL_ABBR_VALUE,
} from '../../../../screens/rule_details';
import { expectNumberOfRules, goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';

import {
  createAndEnableRule,
  createRuleWithoutEnabling,
  fillAboutRuleMinimumAndContinue,
  enablesAndPopulatesThresholdSuppression,
  skipScheduleRuleAction,
  fillAboutRuleAndContinue,
  fillDefineThresholdRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectThresholdRuleType,
  waitForAlertsToPopulate,
  fillDefineThresholdRule,
  continueFromDefineStep,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { getDetails, assertDetailsNotExist } from '../../../../tasks/rule_details';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe(
  'Threshold rules',
  {
    tags: ['@ess', '@serverless'],
  },
  () => {
    const rule = getNewThresholdRule();
    const expectedUrls = rule.references?.join('');
    const expectedFalsePositives = rule.false_positives?.join('');
    const expectedTags = rule.tags?.join('');
    const mitreAttack = rule.threat;
    const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);

    beforeEach(() => {
      deleteAlertsAndRules();
      login();
      visit(CREATE_RULE_URL);
    });

    it('Creates and enables a new threshold rule', () => {
      selectThresholdRuleType();
      fillDefineThresholdRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();
      openRuleManagementPageViaBreadcrumbs();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, 1);

      cy.get(RULE_NAME).should('have.text', rule.name);
      cy.get(RISK_SCORE).should('have.text', rule.risk_score);
      cy.get(SEVERITY).should('have.text', 'High');
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetailsOf(rule.name);

      cy.get(RULE_NAME_HEADER).should('contain', `${rule.name}`);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', rule.description);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS).should('have.text', 'High');
        getDetails(RISK_SCORE_DETAILS).should('have.text', rule.risk_score);
        getDetails(REFERENCE_URLS_DETAILS).should((details) => {
          expect(removeExternalLinkText(details.text())).equal(expectedUrls);
        });
        getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
        getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
          expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
        });
        getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      });
      cy.get(INVESTIGATION_NOTES_TOGGLE).click();
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', rule.query);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Threshold');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
        getDetails(THRESHOLD_DETAILS).should(
          'have.text',
          `Results aggregated by ${rule.threshold.field} >= ${rule.threshold.value}`
        );
        assertDetailsNotExist(SUPPRESS_FOR_DETAILS);
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS)
          .find(INTERVAL_ABBR_VALUE)
          .should('have.text', `${rule.interval}`);
        const humanizedDuration = getHumanizedDuration(
          rule.from ?? 'now-6m',
          rule.interval ?? '5m'
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS)
          .find(INTERVAL_ABBR_VALUE)
          .should('have.text', `${humanizedDuration}`);
      });

      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should(($count) => expect(+$count.text().split(' ')[0]).to.be.lt(100));
      cy.get(ALERT_GRID_CELL).contains(rule.name);
    });

    it('Creates a new threshold rule with suppression enabled', () => {
      selectThresholdRuleType();

      fillDefineThresholdRule(rule);
      enablesAndPopulatesThresholdSuppression(5, 'h');
      continueFromDefineStep();

      // ensures duration displayed on define step in preview mode
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '5h');
      });

      fillAboutRuleMinimumAndContinue(rule);
      skipScheduleRuleAction();
      createRuleWithoutEnabling();
      openRuleManagementPageViaBreadcrumbs();
      goToRuleDetailsOf(rule.name);

      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(SUPPRESS_FOR_DETAILS).should('have.text', '5h');
      });
    });
  }
);
