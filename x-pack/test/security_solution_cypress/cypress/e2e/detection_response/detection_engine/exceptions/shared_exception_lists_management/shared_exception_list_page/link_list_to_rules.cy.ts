/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getExceptionList } from '../../../../../../objects/exception';
import { getNewRule } from '../../../../../../objects/rule';

import { createRule } from '../../../../../../tasks/api_calls/rules';
import { login } from '../../../../../../tasks/login';
import { visit } from '../../../../../../tasks/navigation';

import { EXCEPTIONS_URL } from '../../../../../../urls/navigation';
import {
  assertNumberLinkedRules,
  linkRulesToExceptionList,
  waitForExceptionsTableToBeLoaded,
} from '../../../../../../tasks/exceptions_table';
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

let exceptionListResponse: Cypress.Response<ExceptionListSchema>;

describe(
  'Link lists to rules from "Shared Exception Lists" page',
  { tags: ['@ess', '@serverless'] },
  () => {
    beforeEach(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();
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

    after(() => {
      deleteAlertsAndRules();
      deleteExceptionLists();
      deleteEndpointExceptionList();
    });

    it('Link rules to shared exception list', function () {
      assertNumberLinkedRules(getExceptionList2().list_id, '1');
      linkRulesToExceptionList(getExceptionList2().list_id, 1);
      assertNumberLinkedRules(getExceptionList2().list_id, '2');
    });
  }
);
