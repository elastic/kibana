/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import TestAgent from 'supertest/lib/agent';
import { PatchListSchema, UpdateListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';
import { getUpdateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_list_schema.mock';
import { createListsIndex, deleteListsIndex } from '../../../../utils';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  let admin: TestAgent;
  let socManager: TestAgent;

  describe('@serverless @serverlessQA soc_manager value lists API behaviors', () => {
    before(async () => {
      admin = await utils.createSuperTest('admin');
      socManager = await utils.createSuperTest('soc_manager');
    });

    beforeEach(async () => {
      await createListsIndex(admin, log);
    });

    afterEach(async () => {
      await deleteListsIndex(admin, log);
    });

    // BUG: Requires `manage` privilege, returning 500
    describe.skip('create value list', () => {
      it('should return 200 for soc_manager', async () => {
        await socManager
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);
      });
    });

    describe('delete value list', () => {
      it('should return 200 for soc_manager', async () => {
        // create a list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // delete the list by its list id
        await socManager
          .delete(`${LIST_URL}?id=${getCreateMinimalListSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('find value list', () => {
      it('should return 200 for soc_manager', async () => {
        // add a single list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // query the single list from _find
        await socManager.get(`${LIST_URL}/_find`).set('kbn-xsrf', 'true').send().expect(200);
      });
    });

    // BUG: Requires `manage` privilege, returning 500
    describe.skip('patch value list', () => {
      it('should return 200 for soc_manager', async () => {
        const listId = getCreateMinimalListSchemaMock().id as string;
        // create a simple list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // patch a simple list's name
        const patchedListPayload: PatchListSchema = {
          id: listId,
          name: 'some other name',
        };

        await socManager
          .patch(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(patchedListPayload)
          .expect(200);
      });
    });

    describe('read value list', () => {
      it('should return 200 for soc_manager', async () => {
        // create a simple list to read
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await socManager
          .get(`${LIST_URL}?id=${getCreateMinimalListSchemaMock().id}`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    // BUG: Requires `manage` privilege, returning 500
    describe.skip('update value list', () => {
      it('should return 200 for soc_manager', async () => {
        // create a simple list
        await admin
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // update a simple list's name
        const updatedList: UpdateListSchema = {
          ...getUpdateMinimalListSchemaMock(),
          name: 'some other name',
        };

        await socManager.put(LIST_URL).set('kbn-xsrf', 'true').send(updatedList).expect(200);
      });
    });
  });
};
