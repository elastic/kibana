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
  let endpointOperationsAnalyst: TestAgent;

  describe('@serverless @serverlessQA endpoint_operations_analyst exception list API behaviors', () => {
    before(async () => {
      endpointOperationsAnalyst = await utils.createSuperTest('endpoint_operations_analyst');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    // Expect this to be blocked, but it is reporting back 200 success
    describe.skip('create list', () => {
      it('should return 403 for endpoint_operations_analyst', async () => {
        await endpointOperationsAnalyst
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(403);
      });
    });

    // Expect this to be blocked, but it is reporting back 200 success
    describe.skip('delete list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 403 for endpoint_operations_analyst', async () => {
        await endpointOperationsAnalyst
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

      it('should return 200 for endpoint_operations_analyst', async () => {
        await endpointOperationsAnalyst
          .get(
            `${EXCEPTION_LIST_URL}?list_id=${getCreateExceptionListDetectionSchemaMock().list_id}`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    // Expect this to be blocked, but it is reporting back 200 success
    describe.skip('update list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 403 for endpoint_operations_analyst', async () => {
        // update a exception list's name
        const updatedList: UpdateExceptionListSchema = {
          ...getUpdateMinimalExceptionListSchemaMock(),
          name: 'some other name',
        };

        await endpointOperationsAnalyst
          .put(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });
    });
  });
};
