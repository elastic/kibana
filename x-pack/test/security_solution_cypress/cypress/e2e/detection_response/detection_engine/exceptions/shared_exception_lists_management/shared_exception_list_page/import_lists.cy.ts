/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTIONS_TABLE_SHOWING_LISTS,
  IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN,
} from '../../../../../../screens/exceptions';
import {
  importExceptionListWithSelectingCreateNewOption,
  importExceptionListWithSelectingOverwriteExistingOption,
  importExceptionLists,
  validateImportExceptionListCreateNewOptionDisabled,
  validateImportExceptionListFailedBecauseExistingListFound,
  validateImportExceptionListWentSuccessfully,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';

describe('Import Lists', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  const LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_exception_list.ndjson';
  const ENDPOINT_LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/endpoint_exception_list.ndjson';
  beforeEach(() => {
    login();
    visit(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
  });

  describe('Exception Lists', () => {
    it('Should import exception list successfully if the list does not exist', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListWentSuccessfully();

      cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });

    it('Should not import exception list if it exists', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });

    it('Should import exception list if it exists but the user selected overwrite checkbox', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      importExceptionListWithSelectingOverwriteExistingOption();

      validateImportExceptionListWentSuccessfully();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });

    it('Should import exception list if it exists but the user selected create new checkbox', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      importExceptionListWithSelectingCreateNewOption();

      validateImportExceptionListWentSuccessfully();
      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
    });
  });

  describe('Endpoint Security Exception List', () => {
    before(() => {
      login();
      visit(EXCEPTIONS_URL);

      // Make sure we have Endpoint Security Exception List
      importExceptionLists(ENDPOINT_LIST_TO_IMPORT_FILENAME);
    });

    it('Should not allow to import or create a second Endpoint Security Exception List', () => {
      // Try to import another Endpoint Security Exception List
      importExceptionLists(ENDPOINT_LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate that "Create new list" option is disabled
      validateImportExceptionListCreateNewOptionDisabled();
    });
  });
});
