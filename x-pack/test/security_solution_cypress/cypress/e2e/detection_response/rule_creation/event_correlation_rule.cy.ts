/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tag } from '../../../tags';

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../helpers/rules';
import { getEqlRule, getEqlSequenceRule, getIndexPatterns } from '../../../objects/rule';

import { ALERTS_COUNT, ALERT_DATA_GRID } from '../../../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULES_MANAGEMENT_TABLE,
  RULE_NAME,
  RULE_SWITCH,
  SEVERITY,
} from '../../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
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
  TIMELINE_TEMPLATE_DETAILS,
} from '../../../screens/rule_details';

import { getDetails } from '../../../tasks/rule_details';
import {
  expectNumberOfRules,
  goToRuleDetails,
  goToTheRuleDetailsOf,
} from '../../../tasks/alerts_detection_rules';
import { cleanKibana, deleteAlertsAndRules } from '../../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectEqlRuleType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../../tasks/create_new_rule';
import { login, visit } from '../../../tasks/login';

import { RULE_CREATION } from '../../../urls/navigation';

describe('EQL rules', { tags: [tag.ESS, tag.BROKEN_IN_SERVERLESS] }, () => {
  before(() => {
    cleanKibana();
  });

  beforeEach(() => {
    login();
    deleteAlertsAndRules();
  });

  describe('Detection rules, EQL', () => {
    const rule = getEqlRule();
    const expectedUrls = rule.references?.join('');
    const expectedFalsePositives = rule.false_positives?.join('');
    const expectedTags = rule.tags?.join('');
    const mitreAttack = rule.threat;
    const expectedMitre = formatMitreAttackDescription(mitreAttack ?? []);
    const expectedNumberOfRules = 1;
    const expectedNumberOfAlerts = '2 alerts';

    it('Creates and enables a new EQL rule', function () {
      visit(RULE_CREATION);
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

      cy.get(RULE_NAME).should('have.text', rule.name);
      cy.get(RISK_SCORE).should('have.text', rule.risk_score);
      cy.get(SEVERITY).should('have.text', 'High');
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetails();

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
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Event Correlation');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should('have.text', `${rule.interval}`);
        const humanizedDuration = getHumanizedDuration(
          rule.from ?? 'now-6m',
          rule.interval ?? '5m'
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should('have.text', `${humanizedDuration}`);
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfAlerts);
      cy.get(ALERT_DATA_GRID)
        .invoke('text')
        .then((text) => {
          expect(text).contains(rule.name);
          expect(text).contains(rule.severity);
          expect(text).contains(rule.risk_score);
        });
    });
  });

  describe('Detection rules, sequence EQL', () => {
    const expectedNumberOfSequenceAlerts = '2 alerts';

    const rule = getEqlSequenceRule();

    beforeEach(() => {
      cy.task('esArchiverLoad', 'auditbeat_big');
    });
    afterEach(() => {
      cy.task('esArchiverUnload', 'auditbeat_big');
    });

    it('Creates and enables a new EQL rule with a sequence', function () {
      login();
      visit(RULE_CREATION);
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();
      goToTheRuleDetailsOf(rule.name);
      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfSequenceAlerts);
      cy.get(ALERT_DATA_GRID)
        .invoke('text')
        .then((text) => {
          cy.log('ALERT_DATA_GRID', text);
          expect(text).contains(rule.name);
          expect(text).contains(rule.severity);
        });
    });
  });
});
