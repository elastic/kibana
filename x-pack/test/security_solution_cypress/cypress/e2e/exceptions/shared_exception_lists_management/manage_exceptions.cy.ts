/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getNewRule } from '../../../objects/rule';
import { login } from '../../../tasks/login';
import { visit } from '../../../tasks/navigation';
import { createRule } from '../../../tasks/api_calls/rules';
import {
  addExceptionFlyoutItemName,
  editException,
  editExceptionFlyoutItemName,
  linkFirstRuleOnExceptionFlyout,
  linkFirstSharedListOnExceptionFlyout,
  editFirstExceptionItemInListDetailPage,
  submitEditedExceptionItem,
  submitNewExceptionItem,
  deleteFirstExceptionItemInListDetailPage,
} from '../../../tasks/exceptions';
import { EXCEPTIONS_URL } from '../../../urls/navigation';

import {
  CONFIRM_BTN,
  EXCEPTION_ITEM_VIEWER_CONTAINER,
  EXCEPTION_CARD_ITEM_NAME,
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXECPTION_ITEM_CARD_HEADER_TITLE,
  EMPTY_EXCEPTIONS_VIEWER,
} from '../../../screens/exceptions';
import {
  addExceptionListFromSharedExceptionListHeaderMenu,
  createSharedExceptionList,
  findSharedExceptionListItemsByName,
  waitForExceptionsTableToBeLoaded,
} from '../../../tasks/exceptions_table';
import { visitRuleDetailsPage } from '../../../tasks/rule_details';
import { deleteExceptionLists } from '../../../tasks/common';

// TODO: https://github.com/elastic/kibana/issues/161539
// FLAKY: https://github.com/elastic/kibana/issues/165795
describe(
  'Add, edit and delete exception',
  { tags: ['@ess', '@serverless', '@skipInServerless'] },
  () => {
    beforeEach(() => {
      deleteExceptionLists();
      cy.task('esArchiverLoad', { archiveName: 'exceptions' });
      createRule(getNewRule()).as('createdRule');

      login();
      visit(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    afterEach(() => {
      cy.task('esArchiverUnload', 'exceptions');
    });

    const exceptionName = 'My item name';
    const exceptionNameEdited = 'My item name edited';
    const FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD = 'agent.name';
    const EXCEPTION_LIST_NAME = 'Newly created list';

    describe('Add, Edit and delete Exception item', () => {
      it('should create exception item from Shared Exception List page and linked to a Rule', () => {
        // Click on "Create shared exception list" button on the header
        // Click on "Create exception item"
        addExceptionListFromSharedExceptionListHeaderMenu();

        // Add exception item name
        addExceptionFlyoutItemName(exceptionName);

        // Add Condition
        editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

        // Confirm button should disabled until a rule(s) is selected
        cy.get(CONFIRM_BTN).should('have.attr', 'disabled');

        // select rule
        linkFirstRuleOnExceptionFlyout();

        // should  be able to submit
        cy.get(CONFIRM_BTN).should('not.have.attr', 'disabled');

        submitNewExceptionItem();

        // Navigate to Rule details page
        cy.get<Cypress.Response<RuleResponse>>('@createdRule').then((rule) =>
          visitRuleDetailsPage(rule.body.id, { tab: 'rule_exceptions' })
        );

        // Only one Exception should generated
        cy.get(EXCEPTION_ITEM_VIEWER_CONTAINER).should('have.length', 1);

        // validate the And operator is displayed correctly
        cy.get(EXCEPTION_CARD_ITEM_NAME).should('have.text', exceptionName);
      });

      it('should create exception item from Shared Exception List page, linked to a Shared List and validate Edit/delete in list detail page', function () {
        createSharedExceptionList(
          { name: 'Newly created list', description: 'This is my list.' },
          true
        );

        // After creation - directed to list detail page
        cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', EXCEPTION_LIST_NAME);

        // Go back to Shared Exception List
        visit(EXCEPTIONS_URL);

        // Click on "Create shared exception list" button on the header
        // Click on "Create exception item"
        addExceptionListFromSharedExceptionListHeaderMenu();

        // Add exception item name
        addExceptionFlyoutItemName(exceptionName);

        // Add Condition
        editException(FIELD_DIFFERENT_FROM_EXISTING_ITEM_FIELD, 0, 0);

        // select shared list radio option and select the first one
        linkFirstSharedListOnExceptionFlyout();

        submitNewExceptionItem();

        // New exception is added to the new List
        findSharedExceptionListItemsByName(`${EXCEPTION_LIST_NAME}`, [exceptionName]);

        // Click on the first exception overflow menu items
        // Open the edit modal
        editFirstExceptionItemInListDetailPage();
        // edit exception item name
        editExceptionFlyoutItemName(exceptionNameEdited);

        // submit
        submitEditedExceptionItem();

        // check the new name after edit
        cy.get(EXECPTION_ITEM_CARD_HEADER_TITLE).should('have.text', exceptionNameEdited);

        // Click on the first exception overflow menu items
        // delete the exception
        deleteFirstExceptionItemInListDetailPage();

        cy.get(EMPTY_EXCEPTIONS_VIEWER).should('exist');
      });
    });
  }
);
