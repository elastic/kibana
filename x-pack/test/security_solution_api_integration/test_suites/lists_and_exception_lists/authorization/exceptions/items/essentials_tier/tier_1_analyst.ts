/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { getUpdateMinimalExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_item_schema.mock';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllExceptions } from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let t1Analyst: TestAgent;

  describe('@serverless @serverlessQA t1_analyst exception items API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      t1Analyst = await utils.createSuperTest('t1_analyst');
      await deleteAllExceptions(admin, log);
    });

    afterEach(async () => {
      await deleteAllExceptions(admin, log);
    });

    describe('create exception item', () => {
      it('should return 403 for t1_analyst', async () => {
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await t1Analyst
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(403);
      });
    });

    describe('delete exception item', () => {
      it('should return 403 for t1_analyst', async () => {
        // create an exception list
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create an exception list item
        await admin
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        // delete the exception list item by its item_id
        await t1Analyst
          .delete(
            `${EXCEPTION_LIST_ITEM_URL}?item_id=${
              getCreateExceptionListItemMinimalSchemaMock().item_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .expect(403);
      });
    });

    describe('find exception item', () => {
      it('should return 200 for t1_analyst', async () => {
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await t1Analyst
          .get(
            `${EXCEPTION_LIST_ITEM_URL}/_find?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      });
    });

    describe('read exception item', () => {
      it('should return 200 for t1_analyst', async () => {
        // create a simple exception list to read
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create a simple exception list item to read
        const { body: createListBody } = await admin
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        await t1Analyst
          .get(`${EXCEPTION_LIST_ITEM_URL}?id=${createListBody.id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update exception item', () => {
      it('should return 403 for t1_analyst', async () => {
        // create a simple exception list
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create a simple exception list item
        await admin
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await t1Analyst
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });
    });
  });
};
