/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { LIST_ITEM_URL, LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';
import { getCreateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_item_schema.mock';
import { PatchListItemSchema, UpdateListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getUpdateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_list_item_schema.mock';
import { LIST_ID } from '@kbn/lists-plugin/common/constants.mock';
import { createListsIndex, deleteListsIndex } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let t1Analyst: TestAgent;

  describe('@serverless @serverlessQA t1_analyst value list items API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      t1Analyst = await utils.createSuperTest('t1_analyst');
    });

    beforeEach(async () => {
      await createListsIndex(admin, log);
    });

    afterEach(async () => {
      await deleteListsIndex(admin, log);
    });

    describe('create value list item', () => {
      it('should return 403 for t1_analyst', async () => {
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await t1Analyst
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(403);
      });
    });

    describe('delete value list item', () => {
      it('should return 403 for t1_analyst', async () => {
        // create a list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a list item
        await admin
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        // delete the list item by its list item id
        await t1Analyst
          .delete(`${LIST_ITEM_URL}?id=${getCreateMinimalListItemSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(403);
      });
    });

    // BUG: Should have read priileges
    describe('find value list item', () => {
      it('should return 200 for t1_analyst', async () => {
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await t1Analyst
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      });
    });

    describe('patch value list item', () => {
      it('should return 403 for t1_analyst', async () => {
        const listItemId = getCreateMinimalListItemSchemaMock().id as string;
        // create a simple list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a simple list item
        await admin
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        // patch a simple list item's value
        const patchListItemPayload: PatchListItemSchema = {
          id: listItemId,
          value: '192.168.0.2',
        };

        await t1Analyst
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload)
          .expect(403);
      });
    });

    // BUG: Should have read priileges
    describe('read value list item', () => {
      it('should return 200 for t1_analyst', async () => {
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await admin
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        await t1Analyst
          .get(`${LIST_ITEM_URL}?id=${getCreateMinimalListItemSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update value list item', () => {
      it('should return 403 for t1_analyst', async () => {
        // create a simple list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a simple list item
        await admin
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        // update a simple list item's value
        const updatedListItem: UpdateListItemSchema = {
          ...getUpdateMinimalListItemSchemaMock(),
          value: '192.168.0.2',
        };

        await t1Analyst
          .put(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedListItem)
          .expect(403);
      });
    });
  });
};
