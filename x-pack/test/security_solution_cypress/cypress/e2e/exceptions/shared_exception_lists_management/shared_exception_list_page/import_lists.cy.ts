/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { tag } from '../../../../tags';

import {
  IMPORT_SHARED_EXCEPTION_LISTS_CLOSE_BTN,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../../screens/exceptions';
import {
  waitForExceptionsTableToBeLoaded,
  importExceptionLists,
  importExceptionListWithSelectingOverwriteExistingOption,
  importExceptionListWithSelectingCreateNewOption,
  validateImportExceptionListWentSuccessfully,
  validateImportExceptionListFailedBecauseExistingListFound,
} from '../../../../tasks/exceptions_table';
import { login, visitWithoutDateRange } from '../../../../tasks/login';
import { EXCEPTIONS_URL } from '../../../../urls/navigation';

describe('Import Lists', { tags: [tag.ESS, tag.SERVERLESS] }, () => {
  const LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_exception_list.ndjson';
  before(() => {
    cy.task('esArchiverResetKibana');
  });
  beforeEach(() => {
    login();
    visitWithoutDateRange(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
    cy.intercept(/(\/api\/exception_lists\/_import)/).as('import');
  });

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
