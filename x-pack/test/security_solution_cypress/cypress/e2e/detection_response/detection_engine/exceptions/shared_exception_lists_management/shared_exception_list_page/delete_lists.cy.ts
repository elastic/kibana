/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionList } from '../../../../../../objects/exception';
import { getNewRule } from '../../../../../../objects/rule';

import { createRule } from '../../../../../../tasks/api_calls/rules';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';

import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  deleteExceptionListWithoutRuleReferenceByListId,
  deleteExceptionListWithRuleReferenceByListId,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import { EXCEPTIONS_TABLE_SHOWING_LISTS } from '../../../../../../screens/exceptions';
import {
  createExceptionList,
  deleteEndpointExceptionList,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';

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

describe('Delete from "Shared Exception Lists" page', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();
    login();
  });

  after(() => {
    deleteAlertsAndRules();
    deleteExceptionLists();
    deleteEndpointExceptionList();
  });

  it('Delete exception list without rule reference', () => {
    // Create exception list not used by any rules
    createExceptionList(getExceptionList1(), getExceptionList1().list_id);
    visit(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

    deleteExceptionListWithoutRuleReferenceByListId(getExceptionList1().list_id);

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '0');
  });

  it('Deletes exception list with rule reference', () => {
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

    visit(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '1');

    deleteExceptionListWithRuleReferenceByListId(getExceptionList2().list_id);

    // Using cy.contains because we do not care about the exact text,
    // just checking number of lists shown
    cy.contains(EXCEPTIONS_TABLE_SHOWING_LISTS, '0');
  });
});
