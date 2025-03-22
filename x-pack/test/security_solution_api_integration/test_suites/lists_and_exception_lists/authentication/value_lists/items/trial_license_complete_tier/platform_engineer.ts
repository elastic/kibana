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
import { LIST_ID } from '@kbn/lists-plugin/common/constants.mock';
import { PatchListItemSchema, UpdateListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { getUpdateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_list_item_schema.mock';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { createListsIndex, deleteListsIndex } from '../../../../utils';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let platformEngineer: TestAgent;

  describe('@serverless @serverlessQA platform_engineer value list items API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      platformEngineer = await utils.createSuperTest('platform_engineer');
    });

    beforeEach(async () => {
      await createListsIndex(admin, log);
    });

    afterEach(async () => {
      await deleteListsIndex(admin, log);
    });

    describe('create value list item', () => {
      it('should return 200 for platform_engineer', async () => {
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await platformEngineer
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);
      });
    });

    describe('delete value list item', () => {
      it('should return 200 for platform_engineer', async () => {
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
        await platformEngineer
          .delete(`${LIST_ITEM_URL}?id=${getCreateMinimalListItemSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('find value list item', () => {
      it('should return 200 for platform_engineer', async () => {
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await platformEngineer
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      });
    });

    describe('patch value list item', () => {
      it('should return 200 for platform_engineer', async () => {
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

        await platformEngineer
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload)
          .expect(200);
      });
    });

    describe('read value list item', () => {
      it('should return 200 for platform_engineer', async () => {
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

        await platformEngineer
          .get(`${LIST_ITEM_URL}?id=${getCreateMinimalListItemSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('update value list item', () => {
      it('should return 200 for platform_engineer', async () => {
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

        await platformEngineer
          .put(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(updatedListItem)
          .expect(200);
      });
    });
  });
};
