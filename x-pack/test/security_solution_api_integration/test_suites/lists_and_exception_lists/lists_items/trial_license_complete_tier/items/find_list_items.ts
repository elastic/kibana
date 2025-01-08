/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';

import { LIST_URL, LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { LIST_ITEM_ID, LIST_ID } from '@kbn/lists-plugin/common/constants.mock';
import { getCreateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_item_schema.mock';
import { getCreateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import { createListsIndex, deleteListsIndex } from '../../../utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const log = getService('log');
  const utils = getService('securitySolutionUtils');

  describe('@ess @serverless @serverlessQA find_list_items', () => {
    let supertest: TestAgent;

    before(async () => {
      supertest = await utils.createSuperTest();
    });

    describe('find list items', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      it('should give a validation error if the list_id is not supplied', async () => {
        const { body } = await supertest
          .get(`${LIST_ITEM_URL}/_find`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(400);

        expect(body).toEqual({
          error: 'Bad Request',
          message: '[request query]: list_id: Required',
          statusCode: 400,
        });
      });

      it('should give a 404 if the list has not been created yet', async () => {
        const { body } = await supertest
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ITEM_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(404);

        expect(body).toEqual({
          message: expect.any(String),
          status_code: 404,
        });
      });

      it('should return an empty find body correctly if no list items are loaded', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).toEqual({
          cursor: 'WzBd',
          data: [],
          page: 1,
          per_page: 20,
          total: 0,
        });
      });

      it('should accept empty string filter', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ID}&filter=`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).toEqual({
          cursor: 'WzBd',
          data: [],
          page: 1,
          per_page: 20,
          total: 0,
        });
      });

      it('should return a single list item when a single list item is loaded from a find with defaults added', async () => {
        const listMock = getCreateMinimalListSchemaMock();
        const listItemMock = getCreateMinimalListItemSchemaMock();

        await supertest.post(LIST_URL).set('kbn-xsrf', 'true').send(listMock).expect(200);

        await supertest.post(LIST_ITEM_URL).set('kbn-xsrf', 'true').send(listItemMock).expect(200);

        const { body } = await supertest
          .get(`${LIST_ITEM_URL}/_find?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(body).toMatchObject({
          data: [
            expect.objectContaining({
              list_id: listItemMock.list_id,
              value: listItemMock.value,
              type: listMock.type,
            }),
          ],
          page: 1,
          per_page: 20,
          total: 1,
        });
      });
    });
  });
};
