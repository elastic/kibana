/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListDetectionSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import { UpdateExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getUpdateMinimalExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_schema.mock';
import { deleteAllExceptions } from '../../../../../utils';

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  let t3Analyst: TestAgent;

  describe('@serverless @serverlessQA t3_analyst exception list API behaviors', () => {
    before(async () => {
      t3Analyst = await utils.createSuperTest('t3_analyst');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('create list', () => {
      it('should return 200 for t3_analyst', async () => {
        await t3Analyst
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });
    });

    describe('delete list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 200 for t3_analyst', async () => {
        await t3Analyst
          .delete(
            `${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListDetectionSchemaMock().list_id}`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('read list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 200 for t3_analyst', async () => {
        await t3Analyst
          .get(
            `${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListDetectionSchemaMock().list_id}`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 200 for t3_analyst', async () => {
        // update a exception list's name
        const updatedList: UpdateExceptionListSchema = {
          ...getUpdateMinimalExceptionListSchemaMock(),
          name: 'some other name',
        };

        await t3Analyst
          .put(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(200);
      });
    });
  });
};
