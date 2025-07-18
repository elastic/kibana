/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type SuperTest from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { deleteAllExceptions } from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @ess Exceptions API - Exporting Exception Lists', () => {
    let ids: string[];
    let listIds: string[];

    before(async () => {
      await deleteAllExceptions(supertest, log);

      // create three lists, each with two items
      // TODO make this a method of the lists test service
      ({ ids, listIds } = await bulkCreateExceptionLists(supertest, log, {
        listCount: 3,
        itemCount: 2,
      }));
    });

    after(async () => {
      await deleteAllExceptions(supertest, log);
    });

    it('returns the correct content type header', async () => {
      await supertest
        .post(`${EXCEPTION_LIST_URL}/_bulk_export`)
        .set('kbn-xsrf', 'true')
        .expect('Content-Type', 'application/ndjson')
        .expect(200);
    });

    it('returns an empty response if filter does not match any items', async () => {
      const { body } = await supertest
        .post(`${EXCEPTION_LIST_URL}/_bulk_export`)
        .set('kbn-xsrf', 'true')
        .expect(200);

      expect(body).toEqual([]);
    });

    it('returns a 400 error if the query is malformed', async () => {
      const { body } = await supertest
        .post(`${EXCEPTION_LIST_URL}/_bulk_export`)
        .set('kbn-xsrf', 'true')
        .query({ include_expired_exceptions: 'not-a-boolean' })
        .expect(400);

      expect(body).toEqual(
        expect.objectContaining({
          error: 'Bad Request',
          message: expect.stringContaining('include_expired_exceptions'),
        })
      );
    });

    it('returns the full list of items if no filter is provided');
    it('returns a partial list of items if a filter is provided');
    it('returns a 422 if the total size of the requested lists exceeds the limit');
  });
};

const bulkCreateExceptionLists = async (
  supertest: SuperTest.Agent,
  log: ToolingLog,
  { listCount, itemCount }: { listCount: number; itemCount: number }
): Promise<{ ids: string[]; listIds: string[]; itemIds: Record<string, string[]> }> => {
  const ids: string[] = [];
  const listIds: string[] = [];
  const itemIdsByListId: Record<string, string[]> = {};

  for (let i = 0; i < listCount; i++) {
    const { body: list } = await supertest
      .post(EXCEPTION_LIST_URL)
      .set('kbn-xsrf', 'true')
      .send(getCreateExceptionListMinimalSchemaMock({ list_id: `list-${i}` }))
      .expect(200);

    ids.push(list.id);
    listIds.push(list.list_id);

    for (let j = 0; j < itemCount; j++) {
      const { body: item } = await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(
          getCreateExceptionListItemMinimalSchemaMock({
            list_id: list.list_id,
            item_id: `list-${list.list_id}-item-${j}`,
          })
        )
        .expect(200);

      itemIdsByListId[list.list_id] ||= [];
      itemIdsByListId[list.list_id].push(item.id);
    }
  }

  return { ids, listIds, itemIds: itemIdsByListId };
};
