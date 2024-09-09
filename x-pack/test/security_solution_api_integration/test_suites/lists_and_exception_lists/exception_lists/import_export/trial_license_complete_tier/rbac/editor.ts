/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import {
  getImportExceptionsListSchemaMock,
  toNdJsonString,
} from '@kbn/lists-plugin/common/schemas/request/import_exceptions_schema.mock';
import { deleteAllExceptions } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  let editor: TestAgent;

  describe('@serverless @serverlessQA editor exception list API behaviors', () => {
    before(async () => {
      editor = await utils.createSuperTest('editor');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('create list', () => {
      it('should return 200 for editor', async () => {
        await editor
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });
    });

    describe('export list', () => {
      it('should return 200 for editor', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        await editor
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${body.list_id}"`)
          .expect(200);
      });
    });

    describe('import list', () => {
      it('should return 200 for editor', async () => {
        await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            Buffer.from(toNdJsonString([getImportExceptionsListSchemaMock('some-list-id')])),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);
      });
    });
  });
};
