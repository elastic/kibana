/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getCreateMinimalListItemSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_list_item_schema.mock';
import { getCreateMinimalListSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_list_schema.mock';
import { LIST_ID, NAME } from '../../../../plugins/lists/common/constants.mock';
import { CreateListItemSchema } from '../../../../plugins/lists/common/schemas';
import { FtrProviderContext } from '../../common/ftr_provider_context';

import { LIST_ITEM_URL, LIST_URL } from '../../../../plugins/lists/common/constants';

import { createListsIndex, deleteListsIndex, binaryToString } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('export_list_items', () => {
    describe('exporting lists', () => {
      beforeEach(async () => {
        await createListsIndex(supertest);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest);
      });

      it('should set the response content types to be expected', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        await supertest
          .post(`${LIST_ITEM_URL}/_export?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${NAME}"`)
          .expect(200);
      });

      it('should export a single list item with a list id', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(`${LIST_ITEM_URL}/_export?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);

        expect(body.toString()).to.eql('127.0.0.1\n');
      });

      it('should export two list items with a list id', async () => {
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        const secondList: CreateListItemSchema = {
          ...getCreateMinimalListItemSchemaMock(),
          id: 'list-item-2',
          value: '127.0.0.2',
        };
        await supertest.post(LIST_ITEM_URL).set('kbn-xsrf', 'true').send(secondList).expect(200);

        const { body } = await supertest
          .post(`${LIST_ITEM_URL}/_export?list_id=${LIST_ID}`)
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);

        expect(body.toString()).to.eql('127.0.0.2\n127.0.0.1\n');
      });
    });
  });
};
