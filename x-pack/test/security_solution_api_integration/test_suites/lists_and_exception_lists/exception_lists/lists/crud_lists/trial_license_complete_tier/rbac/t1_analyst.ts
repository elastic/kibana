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
  let t1Analyst: TestAgent;

  describe('@serverless @serverlessQA t1_analyst exception list API behaviors', () => {
    before(async () => {
      t1Analyst = await utils.createSuperTest('t1_analyst');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('create list', () => {
      it('should return 403 for t1_analyst', async () => {
        await t1Analyst
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(403);
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

      it('should return 403 for t1_analyst', async () => {
        await t1Analyst
          .delete(
            `${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListDetectionSchemaMock().list_id}`
          )
          .set('kbn-xsrf', 'true')
          .expect(403);
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

      it('should return 200 for t1_analyst', async () => {
        await t1Analyst
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

      it('should return 403 for t1_analyst', async () => {
        // update a exception list's name
        const updatedList: UpdateExceptionListSchema = {
          ...getUpdateMinimalExceptionListSchemaMock(),
          name: 'some other name',
        };

        await t1Analyst
          .put(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });
    });
  });
};
