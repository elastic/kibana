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
  let t1Analyst: TestAgent;

  describe('@serverless @serverlessQA t1_analyst exception list API behaviors', () => {
    before(async () => {
      t1Analyst = await utils.createSuperTest('t1_analyst');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('export list', () => {
      it('should return 200 for t1_analyst', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        await t1Analyst
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${body.list_id}"`)
          .expect(200);
      });
    });

    // Expect this to be blocked, but it is reporting back 200 success
    describe.skip('import list', () => {
      it('should return 403 for t1_analyst', async () => {
        await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            Buffer.from(toNdJsonString([getImportExceptionsListSchemaMock('some-list-id')])),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(403);
      });
    });
  });
};
