/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getUsername } from '../../../../../../tasks/common';
import {
  expectedExportedExceptionList,
  getExceptionList,
} from '../../../../../../objects/exception';
import { getNewRule } from '../../../../../../objects/rule';

import { createRule } from '../../../../../../tasks/api_calls/rules';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';

import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  assertNumberLinkedRules,
  createSharedExceptionList,
  deleteExceptionListWithoutRuleReferenceByListId,
  deleteExceptionListWithRuleReferenceByListId,
  exportExceptionList,
  linkRulesToExceptionList,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import {
  EXCEPTIONS_LIST_MANAGEMENT_NAME,
  EXCEPTIONS_TABLE_SHOWING_LISTS,
} from '../../../../../../screens/exceptions';
import {
  createExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';

import { TOASTER } from '../../../../../../screens/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';

const EXCEPTION_LIST_NAME = 'My test list';
const EXCEPTION_LIST_TO_DUPLICATE_NAME = 'A test list 2';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_NAME,
  list_id: 'exception_list_1',
});

const getExceptionList2 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_TO_DUPLICATE_NAME,
  list_id: 'exception_list_2',
});

let exceptionListResponse: Cypress.Response<ExceptionListSchema>;

describe(
  'Manage lists from "Shared Exception Lists" page',
  { tags: ['@ess', '@serverless'] },
  () => {
    describe('Create/Export/Delete List', () => {
      beforeEach(() => {
        deleteAlertsAndRules();
        deleteExceptionLists();
        createRule(getNewRule({ name: 'Another rule' }));

        // Create exception list associated with a rule
        createExceptionList(getExceptionList2(), getExceptionList2().list_id).then((response) =>
          createRule(
            getNewRule({
              exceptions_list: [
                {
                  id: response.body.id,
                  list_id: getExceptionList2().list_id,
                  type: getExceptionList2().type,
                  namespace_type: getExceptionList2().namespace_type,
                },
              ],
            })
          )
        );

        // Create exception list not used by any rules
        createExceptionList(getExceptionList1(), getExceptionList1().list_id).then((response) => {
          exceptionListResponse = response;
        });

        login();
        visit(EXCEPTIONS_URL);
        waitForExceptionsTableToBeLoaded();
      });

      it('Export exception list', function () {
        cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

        exportExceptionList(getExceptionList1().list_id);

        cy.wait('@export').then(({ response }) => {
          getUsername('admin').then((username) => {
            cy.wrap(response?.body).should(
              'eql',
              expectedExportedExceptionList(exceptionListResponse, username as string)
            );
          });
          cy.get(TOASTER).should(
            'have.text',
            `Exception list "${EXCEPTION_LIST_NAME}" exported successfully`
          );
        });
      });

      it('Link rules to shared exception list', function () {
        assertNumberLinkedRules(getExceptionList2().list_id, '1');
        linkRulesToExceptionList(getExceptionList2().list_id, 1);
        assertNumberLinkedRules(getExceptionList2().list_id, '2');
      });

      it('Create exception list', function () {
        createSharedExceptionList(
          { name: 'Newly created list', description: 'This is my list.' },
          true
        );

        // After creation - directed to list detail page
        cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', 'Newly created list');
      });

      it('Delete exception list without rule reference', () => {
        // Using cy.contains because we do not care about the exact text,
        // just checking number of lists shown
        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');

        deleteExceptionListWithoutRuleReferenceByListId(getExceptionList1().list_id);

        // Using cy.contains because we do not care about the exact text,
        // just checking number of lists shown
        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
      });

      it('Deletes exception list with rule reference', () => {
        visit(EXCEPTIONS_URL);
        waitForExceptionsTableToBeLoaded();

        // Using cy.contains because we do not care about the exact text,
        // just checking number of lists shown
        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '3');

        deleteExceptionListWithRuleReferenceByListId(getExceptionList2().list_id);

        // Using cy.contains because we do not care about the exact text,
        // just checking number of lists shown
        cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '2');
      });
    });
  }
);
