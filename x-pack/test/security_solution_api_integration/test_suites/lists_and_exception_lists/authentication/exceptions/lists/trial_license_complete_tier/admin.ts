/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import { getUpdateMinimalExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_schema.mock';
import { UpdateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllExceptions } from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const supertest = getService('supertest');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;

  describe('@serverless @serverlessQA admin exception list API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('create exception list', () => {
      it('should return 200 for admin', async () => {
        await admin
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);
      });
    });

    describe('delete exception list', () => {
      it('should return 200 for admin', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await admin
          .delete(
            `${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListMinimalSchemaMock().list_id}`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('duplicate exception list', () => {
      it('should return 200 for admin', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await admin
          .post(
            `${EXCEPTION_LIST_URL}/_duplicate?list_id=${
              getCreateExceptionListDetectionSchemaMock().list_id
            }&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('export exception list', () => {
      it('should return 200 for admin', async () => {
        // create an exception list
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await admin
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${body.list_id}"`)
          .expect(200);
      });
    });

    describe('find exception list', () => {
      it('should return 200 for admin', async () => {
        // add a single exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // query the single exception list from _find
        const { body } = await admin
          .get(`${EXCEPTION_LIST_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body.total).to.eql(1);
      });
    });

    describe('import exception list', () => {
      it('should return 200 for admin', async () => {
        await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            Buffer.from(toNdJsonString([getImportExceptionsListSchemaMock('test_list_id')])),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });
    });

    describe('read exception list', () => {
      it('should return 200 for admin', async () => {
        // create a simple exception list to read
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await admin
          .get(`${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListMinimalSchemaMock().list_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update exception list', () => {
      it('should return 200 for admin', async () => {
        // create a simple exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // update a exception list's name
        const updatedList: UpdateExceptionListSchema = {
          ...getUpdateMinimalExceptionListSchemaMock(),
          name: 'some other name',
        };

        await supertest
          .put(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });
    });
  });
};
