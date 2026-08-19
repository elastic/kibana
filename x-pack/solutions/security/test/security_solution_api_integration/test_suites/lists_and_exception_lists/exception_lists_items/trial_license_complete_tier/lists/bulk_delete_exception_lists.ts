/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { ROLES } from '@kbn/security-solution-plugin/common/test';
import { deleteAndReCreateUserRole } from '../../../../../config/services/common';

import { deleteAllExceptions } from '../../../utils';

import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const exceptionsApi = getService('exceptionsApi');
  const log = getService('log');

  const createList = (overrides: Record<string, unknown> = {}) =>
    supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send({ ...getCreateExceptionListMinimalSchemaMock(), ...overrides })
      .expect(200);

  describe('@ess @serverless @serverlessQA bulk_delete_exception_lists', () => {
    describe('bulk delete exception lists', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should delete multiple exception lists by id and leave others untouched', async () => {
        const { body: list1 } = await createList({ list_id: 'list-1' });
        const { body: list2 } = await createList({ list_id: 'list-2' });
        await createList({ list_id: 'list-3' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list1.id, list2.id] } })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results.map((list: { list_id: string }) => list.list_id).sort()).to.eql([
          'list-1',
          'list-2',
        ]);
        expect(body.summary).to.eql({ total: 2, succeeded: 2, failed: 0, skipped: 0 });

        // the third list should still exist
        await supertest
          .get(`${EXCEPTION_LIST_URL}?list_id=list-3`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should deduplicate repeated ids', async () => {
        const { body: list } = await createList({ list_id: 'list-1' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id, list.id] } })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results).to.have.length(1);
        expect(body.results[0].id).to.eql(list.id);
        expect(body.summary).to.eql({ total: 1, succeeded: 1, failed: 0, skipped: 1 });
      });

      it('should reject an exception list item saved object id without deleting its list or item', async () => {
        const item = { ...getCreateExceptionListItemMinimalSchemaMock(), list_id: 'list-1' };
        await createList({ list_id: 'list-1' });
        const { body: createdItem } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(item)
          .expect(200);

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [createdItem.id] } })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.eql([]);
        expect(body.errors).to.eql([
          {
            lists: [{ id: createdItem.id }],
            message: `exception list id: "${createdItem.id}" does not exist`,
            status_code: 404,
          },
        ]);
        await supertest
          .get(`${EXCEPTION_LIST_URL}?list_id=list-1`)
          .set('kbn-xsrf', 'true')
          .expect(200);
        await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${item.item_id}&namespace_type=single`)
          .set('kbn-xsrf', 'true')
          .expect(200);
      });

      it('should report a partial failure when some lists do not exist', async () => {
        const { body: list1 } = await createList({ list_id: 'list-1' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: [list1.id, 'does-not-exist'] },
          })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.have.length(1);
        expect(body.results[0].list_id).to.eql('list-1');
        expect(body.errors).to.eql([
          {
            lists: [{ id: 'does-not-exist' }],
            message: 'exception list id: "does-not-exist" does not exist',
            status_code: 404,
          },
        ]);
        expect(body.summary).to.eql({ total: 2, succeeded: 1, failed: 1, skipped: 0 });
      });

      it('should return only errors when none of the lists exist', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: ['does-not-exist-1', 'does-not-exist-2'] },
          })
          .expect(200);

        expect(body.success).to.eql(false);
        expect(body.results).to.eql([]);
        expect(body.errors).to.have.length(2);
        expect(body.summary).to.eql({ total: 2, succeeded: 0, failed: 2, skipped: 0 });
      });

      it('should return a 400 when the request body is empty', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: {} as never })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 when ids is empty', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [] } })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 for an unsupported action', async () => {
        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'archive', ids: ['list-1'] } as never })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should return a 400 when the batch exceeds the maximum size', async () => {
        const ids = Array.from({ length: 101 }, (_, index) => `id-${index}`);

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids } })
          .expect(400);

        expect(body.statusCode).to.eql(400);
      });

      it('should cascade delete the items belonging to a deleted list', async () => {
        const item = { ...getCreateExceptionListItemMinimalSchemaMock(), list_id: 'list-1' };
        const { body: list } = await createList({ list_id: 'list-1' });
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(item)
          .expect(200);

        await exceptionsApi
          .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
          .expect(200);

        const { body } = await supertest
          .get(`${EXCEPTION_LIST_ITEM_URL}?item_id=${item.item_id}&namespace_type=single`)
          .set('kbn-xsrf', 'true')
          .expect(404);

        expect(body.status_code).to.eql(404);
      });

      it('should delete lists in the agnostic namespace', async () => {
        const { body: list } = await createList({ list_id: 'list-1', namespace_type: 'agnostic' });

        const { body } = await exceptionsApi
          .bulkDeleteExceptionLists({
            body: { action: 'delete', ids: [list.id], namespace_type: 'agnostic' },
          })
          .expect(200);

        expect(body.success).to.eql(true);
        expect(body.errors).to.eql([]);
        expect(body.results).to.have.length(1);
      });

      describe('@skipInServerless with read rules and all exceptions role', () => {
        const role = ROLES.rules_read_exceptions_all;

        beforeEach(async () => {
          await deleteAndReCreateUserRole(getService, role);
        });

        it('should bulk delete exception lists', async () => {
          const restrictedUser = { username: 'rules_read_exceptions_all', password: 'changeme' };
          const restrictedApis = exceptionsApi.withUser(restrictedUser);

          const { body: list } = await createList({ list_id: 'list-1' });

          const { body } = await restrictedApis
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(200);

          expect(body.results).to.have.length(1);
        });
      });

      describe('@skipInServerless with read rules and read exceptions role', () => {
        const role = ROLES.rules_read_exceptions_read;

        beforeEach(async () => {
          await deleteAndReCreateUserRole(getService, role);
        });

        it('should NOT bulk delete exception lists', async () => {
          const restrictedUser = { username: 'rules_read_exceptions_read', password: 'changeme' };
          const restrictedApis = exceptionsApi.withUser(restrictedUser);

          const { body: list } = await createList({ list_id: 'list-1' });

          await restrictedApis
            .bulkDeleteExceptionLists({ body: { action: 'delete', ids: [list.id] } })
            .expect(403);
        });
      });
    });
  });
};
