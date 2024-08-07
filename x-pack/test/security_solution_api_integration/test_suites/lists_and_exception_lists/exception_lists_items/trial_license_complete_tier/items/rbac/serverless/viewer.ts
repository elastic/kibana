/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { UpdateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getUpdateMinimalExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_exception_list_item_schema.mock';
import { deleteAllExceptions } from '../../../../../utils';

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  let viewer: TestAgent;

  describe('@serverless @serverlessQA viewer exception list item API behaviors', () => {
    before(async () => {
      viewer = await utils.createSuperTest('viewer');
    });

    beforeEach(async () => {
      // Create exception list
      await supertest
        .post(EXCEPTION_LIST_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListMinimalSchemaMock())
        .expect(200);
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('create item', () => {
      it('should return 403 for viewer', async () => {
        await viewer
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(403);
      });
    });

    describe('delete item', () => {
      beforeEach(async () => {
        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);
      });

      it('should return 403 for viewer', async () => {
        await viewer
          .delete(
            `${EXCEPTION_LIST_ITEM_URL}?item_id=${
              getCreateExceptionListItemMinimalSchemaMock().item_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .expect(403);
      });
    });

    describe('find item', () => {
      beforeEach(async () => {
        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);
      });

      it('should return 200 for viewer', async () => {
        await viewer
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

    describe('read item', () => {
      beforeEach(async () => {
        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);
      });

      it('should return 200 for viewer', async () => {
        await viewer
          .get(
            `${EXCEPTION_LIST_ITEM_URL}?item_id=${
              getCreateExceptionListItemMinimalSchemaMock().item_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update item', () => {
      beforeEach(async () => {
        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);
      });

      it('should return 403 for viewer', async () => {
        // update a exception list item's name
        const updatedList: UpdateExceptionListItemSchema = {
          ...getUpdateMinimalExceptionListItemSchemaMock(),
          name: 'some other name',
        };

        await viewer
          .put(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedList)
          .expect(403);
      });
    });
  });
};
