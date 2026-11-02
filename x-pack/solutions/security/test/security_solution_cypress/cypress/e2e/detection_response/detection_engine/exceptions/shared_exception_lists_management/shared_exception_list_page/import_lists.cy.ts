/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_ARTIFACT_LIST_IDS } from '@kbn/securitysolution-list-constants';
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
  validateImportExceptionListFailedOnArtifactTypePrecheck,
} from '../../../../../../tasks/exceptions_table';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';

describe('Import Lists', { tags: ['@ess', '@serverless', '@skipInServerless'] }, () => {
  const LIST_TO_IMPORT_FILENAME = 'cypress/fixtures/7_16_exception_list.ndjson';
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

  describe('When importing Endpoint artifacts', () => {
    const prepareFile = (listId: string) =>
      Cypress.Buffer
        .from(`{"_version":"WzUxOTM4LDE1XQ==","created_at":"2024-03-18T14:11:18.125Z","created_by":"kibana","description":"Endpoint Security Exception List","id":"endpoint_list","immutable":false,"list_id":"${listId}","name":"Endpoint Security Exception List","namespace_type":"agnostic","os_types":[],"tags":[],"tie_breaker_id":"04deda68-7162-4349-8e34-c315bb9f896f","type":"endpoint","updated_at":"2024-03-19T12:57:31.911Z","updated_by":"elastic","version":1}
{"randomFields":"randomValues","list_id":"${listId}"}
{"exported_exception_list_count":1,"exported_exception_list_item_count":0,"missing_exception_list_item_count":0,"missing_exception_list_items":[],"missing_exception_lists":[],"missing_exception_lists_count":0}
`);

    before(() => {
      login();
      visit(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    ENDPOINT_ARTIFACT_LIST_IDS.forEach((listId) => {
      it(`Should not allow to import Endpoint artifacts to "${listId}" list`, () => {
        cy.intercept(/(\/api\/exception_lists\/_import)/, () => {
          throw new Error(`Import API should not be called when importing ${listId} list`);
        });

        importExceptionLists(prepareFile(listId));

        validateImportExceptionListFailedOnArtifactTypePrecheck();
      });
    });
  });
});
