/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import {
  expectedExportedExceptionList,
  getExceptionList,
} from '../../../../../../objects/exception';

import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';

import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  exportExceptionList,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import {
  createExceptionList,
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';

import { TOASTER } from '../../../../../../screens/alerts_detection_rules';
import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';

const EXCEPTION_LIST_NAME = 'My test list';

const getExceptionList1 = () => ({
  ...getExceptionList(),
  name: EXCEPTION_LIST_NAME,
  list_id: 'exception_list_1',
});

let exceptionListResponse: Cypress.Response<ExceptionListSchema>;

describe(
  'Export lists from "Shared Exception Lists" page',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();

      // Create exception list not used by any rules
      createExceptionList(getExceptionList1(), getExceptionList1().list_id).then((response) => {
        exceptionListResponse = response;
      });

      login();
      visit(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    after(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();
    });

    it('Export exception list', function () {
      cy.intercept(/(\/api\/exception_lists\/_export)/).as('export');

      exportExceptionList(getExceptionList1().list_id);

      cy.wait('@export').then(({ response }) => {
        cy.wrap(response?.body).should('eql', expectedExportedExceptionList(exceptionListResponse));

        cy.get(TOASTER).should(
          'have.text',
          `Exception list "${EXCEPTION_LIST_NAME}" exported successfully`
        );
      });
    });
  }
);
