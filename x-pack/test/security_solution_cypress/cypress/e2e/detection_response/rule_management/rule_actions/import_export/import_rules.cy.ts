/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TOASTER } from '../../../../../screens/alerts_detection_rules';
import {
  expectManagementTableRules,
  importRules,
  importRulesWithOverwriteAll,
} from '../../../../../tasks/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../../tasks/api_calls/common';
import { deleteExceptionList } from '../../../../../tasks/api_calls/exceptions';
import { login } from '../../../../../tasks/login';
import { visit } from '../../../../../tasks/navigation';

import { RULES_MANAGEMENT_URL } from '../../../../../urls/rules_management';
const RULES_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_rules.ndjson';
const IMPORTED_EXCEPTION_ID = 'b8dfd17f-1e11-41b0-ae7e-9e7f8237de49';

describe('Import rules', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteExceptionList(IMPORTED_EXCEPTION_ID, 'single');
    cy.intercept('POST', '/api/detection_engine/rules/_import*').as('import');
    visit(RULES_MANAGEMENT_URL);
  });

  it('Imports a custom rule with exceptions', function () {
    importRules(RULES_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should(
        'have.text',
        'Successfully imported 1 ruleSuccessfully imported 1 exception.'
      );

      expectManagementTableRules(['Test Custom Rule']);
    });
  });

  it('Shows error toaster when trying to import rule and exception list that already exist', function () {
    importRules(RULES_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
    });

    cy.reload();
    importRules(RULES_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should('have.text', 'Failed to import 1 ruleFailed to import 2 exceptions');
    });
  });

  it('Does not show error toaster when trying to import rule and exception list that already exist when overwrite is true', function () {
    importRules(RULES_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
    });

    cy.reload();
    importRulesWithOverwriteAll(RULES_TO_IMPORT_FILENAME);

    cy.wait('@import').then(({ response }) => {
      cy.wrap(response?.statusCode).should('eql', 200);
      cy.get(TOASTER).should(
        'have.text',
        'Successfully imported 1 ruleSuccessfully imported 1 exception.'
      );
    });
  });
});
