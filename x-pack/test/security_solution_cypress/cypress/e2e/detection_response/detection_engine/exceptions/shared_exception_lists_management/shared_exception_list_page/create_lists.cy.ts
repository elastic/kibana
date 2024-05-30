/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';

import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  createSharedExceptionList,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import { EXCEPTIONS_LIST_MANAGEMENT_NAME } from '../../../../../../screens/exceptions';
import {
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';

import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';

describe(
  'Create lists from "Shared Exception Lists" page',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();
      login();
      visit(EXCEPTIONS_URL);
      waitForExceptionsTableToBeLoaded();
    });

    after(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();
    });

    it('Create exception list', function () {
      createSharedExceptionList(
        { name: 'Newly created list', description: 'This is my list.' },
        true
      );

      // After creation - directed to list detail page
      cy.get(EXCEPTIONS_LIST_MANAGEMENT_NAME).should('have.text', 'Newly created list');
    });
  }
);
