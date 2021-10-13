/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { CreateExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { EXCEPTION_LIST_URL, EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { NAME } from '../../../../plugins/lists/common/constants.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';

import { binaryToString, deleteAllExceptions } from '../../utils';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe.only('export_exception_list_route', () => {
    describe('exporting exception lists', () => {
      afterEach(async () => {
        await deleteAllExceptions(es);
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

        console.log('-----------------', { body });
        await supertest
          .post(`${EXCEPTION_LIST_URL}/_export?list_id=${body.list_id}`)
          .set('kbn-xsrf', 'true')
          .expect('Content-Disposition', `attachment; filename="${NAME}"`)
          .expect(200);
      });

      it('should export a single list with a list id', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const { body: exportResult } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_export?list_id=${body.list_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);

        expect(exportResult.toString()).to.eql('127.0.0.1\n');
      });

      it('should export two list items with a list id', async () => {
        const { body } = await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const secondList: CreateExceptionListItemSchema = {
          ...getCreateExceptionListItemMinimalSchemaMock(),
          item_id: 'list-item-2',
        };
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(secondList)
          .expect(200);

        const { body: exportResult } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_export?list_id=${body.list_id}`)
          .set('kbn-xsrf', 'true')
          .expect(200)
          .parse(binaryToString);
        const bodyString = exportResult.toString();
        expect(bodyString.includes('127.0.0.1')).to.be(true);
        expect(bodyString.includes('127.0.0.2')).to.be(true);
      });
    });
  });
};
