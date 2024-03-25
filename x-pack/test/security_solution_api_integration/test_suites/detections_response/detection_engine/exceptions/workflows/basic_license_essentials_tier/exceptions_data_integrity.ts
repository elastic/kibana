/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable @typescript-eslint/naming-convention */

import expect from 'expect';

import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
  LIST_URL,
} from '@kbn/securitysolution-list-constants';
import type {
  QueryRuleCreateProps,
  RuleCreateProps,
} from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { createRuleWithExceptionEntries, getSimpleRule } from '../../../../utils';
import {
  deleteAllAlerts,
  deleteAllRules,
  createRule,
} from '../../../../../../../common/utils/security_solution';
import {
  createListsIndex,
  deleteAllExceptions,
  deleteListsIndex,
  importFile,
} from '../../../../../lists_and_exception_lists/utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  // @skipInQA purposefully - only running tests in MKI whose failure should block release
  describe('@serverless @ess @skipInQA exceptions data integrity', () => {
    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
      await deleteAllExceptions(supertest, log);
    });
    /*
        This test to mimic if we have two browser tabs, and the user tried to
        edit an exception in a tab after deleting it in another
      */
    it('should Not edit an exception after being deleted', async () => {
      const { list_id: skippedListId, ...newExceptionItem } =
        getCreateExceptionListDetectionSchemaMock();
      const {
        body: { id, list_id, namespace_type, type },
      } = await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(newExceptionItem)
        .expect(200);

      const ruleWithException: RuleCreateProps = {
        ...getSimpleRule(),
        exceptions_list: [
          {
            id,
            list_id,
            namespace_type,
            type,
          },
        ],
      };

      await createRule(supertest, log, ruleWithException);

      // Delete the exception
      await supertest
        .delete(`${EXCEPTION_LIST_ITEM_URL}?id=${id}&namespace_type=single`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // Edit after delete as if it was opened in another browser tab
      const { body } = await supertest
        .put(`${EXCEPTION_LIST_ITEM_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          id: list_id,
          item_id: id,
          name: 'edit',
          entries: [{ field: 'ss', operator: 'included', type: 'match', value: 'ss' }],
          namespace_type,
          description: 'Exception list item - Edit',
          type: 'simple',
        })
        .expect(404);

      expect(body).toEqual({
        message: `exception list item id: "${list_id}" does not exist`,
        status_code: 404,
      });
    });
    /*
        This test to mimic if we have two browser tabs, and the user tried to
        edit an exception with value-list was deleted in another tab
      */
    it('should Not allow editing an Exception with deleted ValueList', async () => {
      await createListsIndex(supertest, log);

      const valueListId = 'value-list-id.txt';
      await importFile(supertest, log, 'keyword', ['suricata-sensor-amsterdam'], valueListId);
      const rule: QueryRuleCreateProps = {
        ...getSimpleRule(),
        query: 'host.name: "suricata-sensor-amsterdam"',
      };
      const { exceptions_list: exceptionsList } = await createRuleWithExceptionEntries(
        supertest,
        log,
        rule,
        [
          [
            {
              field: 'host.name',
              operator: 'included',
              type: 'list',
              list: {
                id: valueListId,
                type: 'keyword',
              },
            },
          ],
        ]
      );

      const deleteReferences = false;
      const ignoreReferences = true;

      const { id, list_id, namespace_type } = exceptionsList[0];

      // Delete the value list
      await supertest
        .delete(
          `${LIST_URL}?deleteReferences=${deleteReferences}&id=${valueListId}&ignoreReferences=${ignoreReferences}`
        )
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // edit the exception with the deleted value list
      await supertest
        .put(`${EXCEPTION_LIST_ITEM_URL}`)
        .set('kbn-xsrf', 'true')
        .send({
          id: list_id,
          item_id: id,
          name: 'edit',
          entries: [
            {
              field: 'host.name',
              operator: 'included',
              type: 'list',
              list: {
                id: valueListId,
                type: 'keyword',
              },
            },
          ],
          namespace_type,
          description: 'Exception list item - Edit',
          type: 'simple',
        })
        .expect(404);

      await deleteListsIndex(supertest, log);
    });
  });
};
