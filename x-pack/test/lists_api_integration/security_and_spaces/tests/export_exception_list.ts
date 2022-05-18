/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';

import { getCreateExceptionListMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import {
  removeExceptionListServerGeneratedProperties,
  removeExceptionListItemServerGeneratedProperties,
  binaryToString,
  deleteAllExceptions,
} from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('export_exception_list_route', () => {
    describe('exporting exception lists', () => {
      afterEach(async () => {
        await deleteAllExceptions(supertest, log);
      });

      it('should set the response content types to be expected', async () => {
        // create an exception list
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        await supertest
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single`
          )
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${body.list_id}"`)
          .expect(200);
      });

      it('should return 404 if given ids that do not exist', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const { body: exportBody } = await supertest
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=not_exist&list_id=not_exist&namespace_type=single`
          )
          .set('kbn-xsrf', 'true')
          .expect(400);

        expect(exportBody).to.eql({
          message: 'exception list with list_id: not_exist or id: not_exist does not exist',
          status_code: 400,
        });
      });

      it('should export a single list with a list id', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body: itemBody } = await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const { body: exportResult } = await supertest
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single`
          )
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);

        const exportedItemsToArray = exportResult.toString().split('\n');
        const list = JSON.parse(exportedItemsToArray[0]);
        const item = JSON.parse(exportedItemsToArray[1]);

        expect(removeExceptionListServerGeneratedProperties(list)).to.eql(
          removeExceptionListServerGeneratedProperties(body)
        );
        expect(removeExceptionListItemServerGeneratedProperties(item)).to.eql(
          removeExceptionListItemServerGeneratedProperties(itemBody)
        );
      });

      it('should export two list items with a list id', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const secondExceptionListItem: CreateExceptionListItemSchema = {
          ...getCreateExceptionListItemMinimalSchemaMock(),
          item_id: 'some-list-item-id-2',
        };
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(secondExceptionListItem)
          .expect(200);

        const { body: exportResult } = await supertest
          .post(
            `${EXCEPTION_LIST_URL}/_export?id=${body.id}&list_id=${body.list_id}&namespace_type=single`
          )
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);

        const bodyString = exportResult.toString();
        expect(bodyString.includes('some-list-item-id-2')).to.be(true);
        expect(bodyString.includes('some-list-item-id')).to.be(true);
      });
    });
  });
};
