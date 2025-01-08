/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription, getHumanizedDuration } from '../../../../helpers/rules';
import { getEqlRule, getEqlSequenceRule, getIndexPatterns } from '../../../../objects/rule';

import { ALERTS_COUNT, ALERT_DATA_GRID } from '../../../../screens/alerts';
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
  EQL_QUERY_DETAILS,
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
  INTERVAL_ABBR_VALUE,
} from '../../../../screens/rule_details';

import { getDetails } from '../../../../tasks/rule_details';
import { expectNumberOfRules, goToRuleDetailsOf } from '../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import {
  continueFromDefineStep,
  createAndEnableRule,
  createRuleWithNonBlockingErrors,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  getDefineContinueButton,
  getIndexPatternClearButton,
  getRuleIndexInput,
  selectEqlRuleType,
  waitForAlertsToPopulate,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import { openRuleManagementPageViaBreadcrumbs } from '../../../../tasks/rules_management';
import { CREATE_RULE_URL } from '../../../../urls/navigation';
import {
  EQL_OPTIONS_POPOVER_TRIGGER,
  EQL_OPTIONS_TIMESTAMP_INPUT,
  EQL_QUERY_INPUT,
  EQL_QUERY_VALIDATION_ERROR,
  EQL_QUERY_VALIDATION_ERROR_CONTENT,
  RULES_CREATION_FORM,
} from '../../../../screens/create_new_rule';

// Skip in MKI due to flake
describe('EQL rules', { tags: ['@ess', '@serverless', '@skipInServerlessMKI'] }, () => {
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
    const expectedNumberOfAlerts = '1 alert';

    it('Creates and enables a new EQL rule', function () {
      visit(CREATE_RULE_URL);
      selectEqlRuleType();
      fillDefineEqlRuleAndContinue(rule);
      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createAndEnableRule();
      openRuleManagementPageViaBreadcrumbs();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      expectNumberOfRules(RULES_MANAGEMENT_TABLE, expectedNumberOfRules);

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
        getDetails(EQL_QUERY_DETAILS).should('have.text', rule.query);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'Event Correlation');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
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

    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'auditbeat_multiple' });
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'auditbeat_multiple' });
    });

    it(
      'Creates and enables a new EQL rule with a sequence',
      {
        tags: ['@skipInServerlessMKI'],
      },
      function () {
        login();
        visit(CREATE_RULE_URL);
        selectEqlRuleType();
        fillDefineEqlRuleAndContinue(rule);
        fillAboutRuleAndContinue(rule);
        fillScheduleRuleAndContinue(rule);
        createAndEnableRule();
        openRuleManagementPageViaBreadcrumbs();
        goToRuleDetailsOf(rule.name);
        waitForAlertsToPopulate();

        cy.get(ALERTS_COUNT).should('have.text', expectedNumberOfSequenceAlerts);
        cy.get(ALERT_DATA_GRID)
          .invoke('text')
          .then((text) => {
            cy.log('ALERT_DATA_GRID', text);
            expect(text).contains(rule.name);
            expect(text).contains(rule.severity);
          });
      }
    );
  });

  describe('with source data requiring EQL overrides', () => {
    before(() => {
      cy.task('esArchiverLoad', { archiveName: 'no_at_timestamp_field', type: 'ftr' });
    });

    after(() => {
      cy.task('esArchiverUnload', { archiveName: 'no_at_timestamp_field', type: 'ftr' });
    });

    it('includes EQL options in query validation', () => {
      login();
      visit(CREATE_RULE_URL);
      selectEqlRuleType();
      getIndexPatternClearButton().click();
      getRuleIndexInput().type(`auditbeat-no_at_timestamp_field{enter}`);

      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type('any where true');

      cy.get(EQL_QUERY_VALIDATION_ERROR).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR).should('have.text', '1');

      cy.get(RULES_CREATION_FORM).find(EQL_OPTIONS_POPOVER_TRIGGER).click();
      cy.get(EQL_OPTIONS_TIMESTAMP_INPUT).type('event.ingested{enter}');

      cy.get(EQL_QUERY_VALIDATION_ERROR).should('not.exist');
    });
  });

  describe('EQL query validation', () => {
    const rule = getEqlRule();

    it('validates missing data source', () => {
      visit(CREATE_RULE_URL);
      selectEqlRuleType();
      getIndexPatternClearButton().click();
      getRuleIndexInput().type('endgame-*{enter}');

      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type('any where true');

      const expectedValidationError = `index_not_found_exception\n\tCaused by:\n\t\tverification_exception: Found 1 problem\nline -1:-1: Unknown index [*,-*]\n\tRoot causes:\n\t\tverification_exception: Found 1 problem\nline -1:-1: Unknown index [*,-*]`;
      cy.get(EQL_QUERY_VALIDATION_ERROR).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR).should('have.text', '1');
      cy.get(EQL_QUERY_VALIDATION_ERROR).click();
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should(
        'have.text',
        `EQL Validation Errors${expectedValidationError}`
      );
      continueFromDefineStep();

      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createRuleWithNonBlockingErrors();
    });

    it('validates missing data fields', () => {
      visit(CREATE_RULE_URL);
      selectEqlRuleType();

      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type('any where field1');

      cy.get(EQL_QUERY_VALIDATION_ERROR).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR).should('have.text', '1');
      cy.get(EQL_QUERY_VALIDATION_ERROR).click();
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should(
        'have.text',
        'EQL Validation ErrorsFound 1 problem\nline 1:11: Unknown column [field1]'
      );
      continueFromDefineStep();

      fillAboutRuleAndContinue(rule);
      fillScheduleRuleAndContinue(rule);
      createRuleWithNonBlockingErrors();
    });

    it('validates syntax errors', () => {
      visit(CREATE_RULE_URL);
      selectEqlRuleType();

      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('exist');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).should('be.visible');
      cy.get(RULES_CREATION_FORM).find(EQL_QUERY_INPUT).type('test any where true');

      cy.get(EQL_QUERY_VALIDATION_ERROR).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR).should('have.text', '1');
      cy.get(EQL_QUERY_VALIDATION_ERROR).click();
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should('be.visible');
      cy.get(EQL_QUERY_VALIDATION_ERROR_CONTENT).should(
        'have.text',
        `EQL Validation Errorsline 1:6: extraneous input 'any' expecting 'where'`
      );
      continueFromDefineStep();
      getDefineContinueButton().should('exist');
    });
  });
});
