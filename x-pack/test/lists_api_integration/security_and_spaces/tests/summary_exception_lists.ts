/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { LIST_ID } from '../../../../plugins/lists/common/constants.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';
import { createListsIndex, deleteListsIndex, deleteAllExceptions } from '../../utils';

interface SummaryResponseType {
  body: ExceptionListSummarySchema;
}
// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('summary_exception_lists', () => {
    describe('summary exception lists', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });
      afterEach(async () => {
        await deleteListsIndex(supertest, log);
        await deleteAllExceptions(supertest, log);
      });

      it('should give a validation error if the list_id and the id are not supplied', async () => {
        const { body } = await supertest
          .get(`${EXCEPTION_LIST_URL}/summary`)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(400);

        expect(body).to.eql({
          message: 'id or list_id required',
          status_code: 400,
        });
      });

      it('should return init summary when there are no items created', async () => {
        const { body }: SummaryResponseType = await supertest
          .get(`${EXCEPTION_LIST_URL}/summary?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const expected: ExceptionListSummarySchema = {
          linux: 0,
          macos: 0,
          total: 0,
          windows: 0,
        };
        expect(body).to.eql(expected);
      });

      it('should return right summary when there are items created', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const item = getCreateExceptionListItemMinimalSchemaMock();

        for (const os of ['windows', 'linux', 'macos']) {
          await supertest
            .post(EXCEPTION_LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...item, os_types: [os], item_id: `${item.item_id}-${os}` })
            .expect(200);
        }

        const { body }: SummaryResponseType = await supertest
          .get(`${EXCEPTION_LIST_URL}/summary?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const expected: ExceptionListSummarySchema = {
          linux: 1,
          macos: 1,
          total: 3,
          windows: 1,
        };
        expect(body).to.eql(expected);
      });

      it('should not sum up the items by OS for summary total', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const item = getCreateExceptionListItemMinimalSchemaMock();

        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...item,
            os_types: ['windows', 'linux', 'macos'],
            item_id: `${item.item_id}-some_item_id`,
          })
          .expect(200);

        const { body }: SummaryResponseType = await supertest
          .get(`${EXCEPTION_LIST_URL}/summary?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        const expected: ExceptionListSummarySchema = {
          linux: 1,
          macos: 1,
          total: 1,
          windows: 1,
        };
        expect(body).to.eql(expected);
      });
    });
  });
};
