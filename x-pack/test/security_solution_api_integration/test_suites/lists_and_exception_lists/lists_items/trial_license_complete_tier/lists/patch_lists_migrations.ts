/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { PatchListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { LIST_URL, LIST_INDEX } from '@kbn/securitysolution-list-constants';

import {
  createListsIndex,
  deleteListsIndex,
  createListsIndices,
  createListBypassingChecks,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess patch_lists_migrations', () => {
    describe('patch lists', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });
      describe('legacy list index (list created before migration to data stream)', () => {
        beforeEach(async () => {
          await deleteListsIndex(supertest, log);
        });

        afterEach(async () => {
          await deleteListsIndex(supertest, log);
        });
        it('should update list container that was created in legacy index and migrated through LIST_INDEX request', async () => {
          const listId = 'random-list';
          // create legacy indices
          await createListsIndices(es);
          // create a simple list
          await createListBypassingChecks({ es, id: listId });

          // migrates old indices to data streams
          await supertest.post(LIST_INDEX).set('kbn-xsrf', 'true');

          // patch a simple list's name
          const patchPayload: PatchListSchema = {
            id: listId,
            name: 'some other name',
          };
          const { body } = await supertest
            .patch(LIST_URL)
            .set('kbn-xsrf', 'true')
            .send(patchPayload)
            .expect(200);

          expect(body.name).to.be('some other name');
        });

        it('should update list container that was created in legacy index and not yet migrated', async () => {
          const listId = 'random-list';
          // create legacy indices
          await createListsIndices(es);
          // create a simple list
          await createListBypassingChecks({ es, id: listId });

          // patch a simple list's name
          const patchPayload: PatchListSchema = {
            id: listId,
            name: 'some other name',
          };
          const { body } = await supertest
            .patch(LIST_URL)
            .set('kbn-xsrf', 'true')
            .send(patchPayload)
            .expect(200);

          expect(body.name).to.be('some other name');
        });
      });
    });
  });
};
