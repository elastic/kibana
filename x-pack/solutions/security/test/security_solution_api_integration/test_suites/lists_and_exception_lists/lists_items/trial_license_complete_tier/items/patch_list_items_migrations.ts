/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { PatchListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_ITEM_URL, LIST_INDEX } from '@kbn/securitysolution-list-constants';

import {
  createListsIndex,
  deleteListsIndex,
  createListsIndices,
  createListBypassingChecks,
  createListItemBypassingChecks,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess patch_list_items_migrations', () => {
    describe('patch list items', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      describe('legacy list items index (list created before migration to data stream)', () => {
        beforeEach(async () => {
          await deleteListsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteListsIndex(supertest, log);
        });
        it('should patch list item that was created in legacy index and migrated through LIST_INDEX request', async () => {
          const listId = 'random-list';
          const listItemId = 'random-list-item';
          // create legacy indices
          await createListsIndices(es);
          // create a simple list
          await createListBypassingChecks({ es, id: listId });
          await createListItemBypassingChecks({ es, listId, id: listItemId, value: 'random' });
          // migrates old indices to data streams
          await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true');

          const patchPayload: PatchListItemSchema = {
            id: listItemId,
            value: 'new one',
          };

          const { body } = await supertest
            .patch(LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send(patchPayload)
            .expect(200);

          expect(body.value).to.be('new one');
        });

        it('should patch list item that was created in legacy index and not yet migrated', async () => {
          const listId = 'random-list';
          const listItemId = 'random-list-item';
          // create legacy indices
          await createListsIndices(es);
          // create a simple list
          await createListBypassingChecks({ es, id: listId });
          await createListItemBypassingChecks({ es, listId, id: listItemId, value: 'random' });

          const patchPayload: PatchListItemSchema = {
            id: listItemId,
            value: 'new one',
          };

          const { body } = await supertest
            .patch(LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send(patchPayload)
            .expect(200);

          expect(body.value).to.be('new one');
        });
      });
    });
  });
};
