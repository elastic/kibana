/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteAlertsAndRules } from '../../../../../../tasks/api_calls/common';
import { createRule } from '../../../../../../tasks/api_calls/rules';
import { getExceptionList } from '../../../../../../objects/exception';
import { assertNumberOfExceptionItemsExists } from '../../../../../../tasks/exceptions';
import {
  assertExceptionListsExists,
  duplicateSharedExceptionListFromListsManagementPageByListId,
  findSharedExceptionListItemsByName,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';
import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  createExceptionList,
  createExceptionListItem,
  deleteExceptionLists,
} from '../../../../../../tasks/api_calls/exceptions';
import { getNewRule } from '../../../../../../objects/rule';

const expiredDate = new Date(Date.now() - 1000000).toISOString();
const futureDate = new Date(Date.now() + 1000000).toISOString();
const EXCEPTION_LIST_NAME = 'My test list';
const EXCEPTION_LIST_TO_DUPLICATE_NAME = 'A test list 2';
const EXCEPTION_LIST_ITEM_NAME = 'Sample Exception List Item 1';
const EXCEPTION_LIST_ITEM_NAME_2 = 'Sample Exception List Item 2';

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

describe('Duplicate List', { tags: ['@ess', '@serverless'] }, () => {
  beforeEach(() => {
    login();
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
    createExceptionList(getExceptionList1(), getExceptionList1().list_id);
    // Create exception list associated with a rule
    createExceptionList(getExceptionList2(), getExceptionList2().list_id);

    createExceptionListItem(getExceptionList2().list_id, {
      list_id: getExceptionList2().list_id,
      item_id: 'simple_list_item_1',
      tags: [],
      type: 'simple',
      description: 'Test exception item',
      name: EXCEPTION_LIST_ITEM_NAME,
      namespace_type: 'single',
      entries: [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host', 'another host'],
        },
      ],
      expire_time: expiredDate,
    });
    createExceptionListItem(getExceptionList2().list_id, {
      list_id: getExceptionList2().list_id,
      item_id: 'simple_list_item_2',
      tags: [],
      type: 'simple',
      description: 'Test exception item',
      name: EXCEPTION_LIST_ITEM_NAME_2,
      namespace_type: 'single',
      entries: [
        {
          field: 'host.name',
          operator: 'included',
          type: 'match_any',
          value: ['some host', 'another host'],
        },
      ],
      expire_time: futureDate,
    });
    visit(EXCEPTIONS_URL);
    waitForExceptionsTableToBeLoaded();
  });

  it('Duplicate exception list with expired items', function () {
    duplicateSharedExceptionListFromListsManagementPageByListId(getExceptionList2().list_id, true);

    // After duplication - check for new list
    assertExceptionListsExists([`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`]);

    findSharedExceptionListItemsByName(`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`, [
      EXCEPTION_LIST_ITEM_NAME,
      EXCEPTION_LIST_ITEM_NAME_2,
    ]);

    assertNumberOfExceptionItemsExists(2);
  });

  it('Duplicate exception list without expired items', function () {
    duplicateSharedExceptionListFromListsManagementPageByListId(getExceptionList2().list_id, false);

    // After duplication - check for new list
    assertExceptionListsExists([`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`]);

    findSharedExceptionListItemsByName(`${EXCEPTION_LIST_TO_DUPLICATE_NAME} [Duplicate]`, [
      EXCEPTION_LIST_ITEM_NAME_2,
    ]);

    assertNumberOfExceptionItemsExists(1);
  });
});
