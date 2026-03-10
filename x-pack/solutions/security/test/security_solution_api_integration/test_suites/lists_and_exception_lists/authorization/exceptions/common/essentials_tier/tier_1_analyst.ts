/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllExceptions } from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let t1Analyst: TestAgent;

  describe('@serverless @serverlessQA t1_analyst exception list and item API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      t1Analyst = await utils.createSuperTest('t1_analyst');
      await deleteAllExceptions(admin, log);
    });

    afterEach(async () => {
      await deleteAllExceptions(admin, log);
    });

    describe('duplicate exception list', () => {
      it('should return 403 for t1_analyst', async () => {
        // create an exception list
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        await admin
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMock(),
            list_id: getCreateExceptionListDetectionSchemaMock().list_id,
          })
          .expect(200);

        await t1Analyst
          .post(
            `${EXCEPTION_LIST_URL}/_duplicate?list_id=${
              getCreateExceptionListDetectionSchemaMock().list_id
            }&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect(403);
      });
    });

    describe('export exception list', () => {
      it('should return 200 for t1_analyst', async () => {
        const { body } = await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await admin
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        await t1Analyst
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('import exception list', () => {
      it('should return 403 for t1_analyst', async () => {
        await t1Analyst
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            Buffer.from(
              toNdJsonString([
                getImportExceptionsListSchemaMock('test_list_id'),
                getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              ])
            ),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(403);
      });
    });
  });
};
