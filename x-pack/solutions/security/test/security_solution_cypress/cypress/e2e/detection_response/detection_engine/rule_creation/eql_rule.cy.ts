/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEqlRule, getEqlSequenceRule } from '../../../../objects/rule';

import { RULE_NAME_HEADER } from '../../../../screens/rule_details';

import {
  continueFromDefineStep,
  createRuleWithNonBlockingErrors,
  createRuleWithoutEnabling,
  fillAboutRuleAndContinue,
  fillDefineEqlRuleAndContinue,
  fillScheduleRuleAndContinue,
  getDefineContinueButton,
  getIndexPatternClearButton,
  getRuleIndexInput,
  selectEqlRuleType,
} from '../../../../tasks/create_new_rule';
import { login } from '../../../../tasks/login';
import { visit } from '../../../../tasks/navigation';
import {
  EQL_OPTIONS_POPOVER_TRIGGER,
  EQL_OPTIONS_TIMESTAMP_INPUT,
  EQL_QUERY_INPUT,
  EQL_QUERY_VALIDATION_ERROR,
  EQL_QUERY_VALIDATION_ERROR_CONTENT,
  RULES_CREATION_FORM,
} from '../../../../screens/create_new_rule';
import { deleteAlertsAndRules } from '../../../../tasks/api_calls/common';
import { CREATE_RULE_URL } from '../../../../urls/navigation';

describe('EQL Rule - Rule Creation', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    login();
    visit(CREATE_RULE_URL);
  });

  it('Creates a new EQL rule', function () {
    const rule = getEqlRule();

    selectEqlRuleType();
    fillDefineEqlRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createRuleWithoutEnabling();

    cy.log('Asserting we have a new rule created');
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);
  });

  it('Creates a new EQL rule with a sequence', () => {
    const rule = getEqlSequenceRule();

    selectEqlRuleType();
    fillDefineEqlRuleAndContinue(rule);
    fillAboutRuleAndContinue(rule);
    fillScheduleRuleAndContinue(rule);
    createRuleWithoutEnabling();

    cy.log('Asserting we have a new rule created');
    cy.get(RULE_NAME_HEADER).should('contain', rule.name);
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
