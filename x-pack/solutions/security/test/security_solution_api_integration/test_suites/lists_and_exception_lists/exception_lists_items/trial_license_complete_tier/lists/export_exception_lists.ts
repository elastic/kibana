/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type SuperTest from 'supertest';
import { ToolingLog } from '@kbn/tooling-log';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import {
  removeExceptionListServerGeneratedProperties,
  removeExceptionListItemServerGeneratedProperties,
  binaryToString,
  deleteAllExceptions,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@serverless @ess Exceptions API - Exporting Exception Lists', () => {
    let ids: string[];
    let listIds: string[];

    beforeEach(async () => {
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
        .send({})
        .expect(200);

      expect(body).to.eql([]);
    });

    it('returns the full list of items if no filter is provided');
    it('returns a partial list of items if a filter is provided');
    it('returns a 400 error if the query is malformed');
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
      .send(getCreateExceptionListMinimalSchemaMock())
      .expect(200);

    ids.push(list.id);
    listIds.push(list.list_id);

    for (let j = 0; j < itemCount; j++) {
      const { body: item } = await supertest
        .post(EXCEPTION_LIST_ITEM_URL)
        .set('kbn-xsrf', 'true')
        .send(getCreateExceptionListItemMinimalSchemaMock())
        .expect(200);

      itemIdsByListId[list.list_id] ||= [];
      itemIdsByListId[list.list_id].push(item.id);
    }
  }

  return { ids, listIds, itemIds: itemIdsByListId };
};
