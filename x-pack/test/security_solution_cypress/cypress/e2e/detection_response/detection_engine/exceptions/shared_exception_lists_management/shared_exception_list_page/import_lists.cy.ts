/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';
import {
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';
import {
  IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../../../../screens/exceptions';
import {
  waitForExceptionsTableToBeLoaded,
  importExceptionLists,
  importExceptionListWithSelectingOverwriteExistingOption,
  importExceptionListWithSelectingCreateNewOption,
  validateImportExceptionListWentSuccessfully,
  validateImportExceptionListFailedBecauseExistingListFound,
  validateImportExceptionListCreateNewOptionDisabled,
} from '../../../../../../tasks/exceptions_table';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';

describe('Import Lists', { tags: ['@ess', '@serverless'] }, () => {
  const LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_exception_list.ndjson';
  const ENDPOINT_LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/endpoint_exception_list.ndjson';
  beforeEach(() => {
    login();
    deleteAlertsAndRules();
    deleteExceptionLists();
    deleteEndpointExceptionList();
    visit(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
  });

  after(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();
    deleteEndpointExceptionList();
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
      validateImportExceptionListWentSuccessfully();
      cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

      // Import same list again
      importExceptionLists(LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });

    it('Should import exception list if it exists but the user selected overwrite checkbox', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);
      validateImportExceptionListWentSuccessfully();
      cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      importExceptionLists(LIST_TO_IMPORT_FILENAME);
      importExceptionListWithSelectingOverwriteExistingOption();

      validateImportExceptionListWentSuccessfully();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');
    });

    it('Should import exception list if it exists but the user selected create new checkbox', () => {
      importExceptionLists(LIST_TO_IMPORT_FILENAME);
      validateImportExceptionListWentSuccessfully();
      cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

      importExceptionLists(LIST_TO_IMPORT_FILENAME);
      importExceptionListWithSelectingCreateNewOption();

      validateImportExceptionListWentSuccessfully();
      // Validate table items count
      cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
    });
  });

  describe('Endpoint Security Exception List', () => {
    it('Should not allow to import or create a second Endpoint Security Exception List', () => {
      // Make sure we have Endpoint Security Exception List
      importExceptionLists(ENDPOINT_LIST_TO_IMPORT_FILENAME);
      validateImportExceptionListWentSuccessfully();
      cy.get(IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN).click();

      // Try to import another Endpoint Security Exception List
      importExceptionLists(ENDPOINT_LIST_TO_IMPORT_FILENAME);

      validateImportExceptionListFailedBecauseExistingListFound();

      // Validate that "Create new list" option is disabled
      validateImportExceptionListCreateNewOptionDisabled();
    });
  });
});
