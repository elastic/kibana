/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { getCreateExceptionListItemMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_item_schema.mock';
import { getCreateExceptionListMinimalSchemaMock } from '../../../../plugins/lists/common/schemas/request/create_exception_list_schema.mock';
import {
  toNdJsonString,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
} from '../../../../plugins/lists/common/schemas/request/import_exceptions_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllExceptions } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');

  describe('import_exceptions', () => {
    beforeEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    it('should reject with an error if the file type is not that of a ndjson', async () => {
      const { body } = await supertest
        .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
        .set('kbn-xsrf', 'true')
        .attach(
          'file',
          toNdJsonString([getImportExceptionsListSchemaMock('some-list-id')]),
          'exceptions.txt'
        )
        .expect(400);

      expect(body).to.eql({
        status_code: 400,
        message: 'Invalid file extension .txt',
      });
    });

    describe('"overwrite" is false', () => {
      it('should report duplicate error when importing exception list matches an existing list with same "list_id"', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListSchemaMock('some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'Found that list_id: "some-list-id" already exists. Import of list_id: "some-list-id" skipped.',
                status_code: 409,
              },
              list_id: 'some-list-id',
            },
          ],
          success: false,
          success_count: 0,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 0,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report duplicate error when importing two exception lists with same "list_id"', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock(),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'More than one exception list with list_id: "detection_list_id" found in imports. The last list will be used.',
                status_code: 400,
              },
              list_id: 'detection_list_id',
            },
          ],
          success: false,
          success_count: 1,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report that it imported an exception list successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListSchemaMock()]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with one item successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
          success_count_exception_list_items: 1,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with multiple items successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id-2', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 3,
          success_count_exception_list_items: 2,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock('test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists and items successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id_2', 'test_list_id'),
              getImportExceptionsListSchemaMock('test_list_id_2'),
              getImportExceptionsListItemSchemaMock('test_item_id_3', 'test_list_id_2'),
              getImportExceptionsListItemSchemaMock('test_item_id_4', 'test_list_id_2'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 6,
          success_count_exception_list_items: 4,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report an error when importing an exception list item for which no matching "list_id" exists', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListItemSchemaMock('1', 'some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'Exception list with list_id: "some-list-id", not found for exception list item with item_id: "1"',
                status_code: 409,
              },
              item_id: '1',
              list_id: 'some-list-id',
            },
          ],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 0,
          success_exception_list_items: false,
          success_exception_lists: true,
          success: false,
          success_count: 0,
        });
      });
    });

    describe('"overwrite" is true', () => {
      it('should NOT report duplicate error when importing exception list matches an existing list with same "list_id"', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListSchemaMock('some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report error when importing exception list item matches an existing list item with same "item_id" but differing "list_id"s', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...getCreateExceptionListMinimalSchemaMock(), list_id: 'a_list_id' })
          .expect(200);
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...getCreateExceptionListItemMinimalSchemaMock(), list_id: 'a_list_id' })
          .expect(200);

        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListItemSchemaMock('some-list-item-id', 'some-list-id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'Error trying to update item_id: "some-list-item-id" and list_id: "some-list-id". The item already exists under list_id: a_list_id',
                status_code: 409,
              },
              item_id: 'some-list-item-id',
              list_id: 'some-list-id',
            },
          ],
          success: false,
          success_count: 0,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 0,
          success_exception_list_items: false,
          success_exception_lists: true,
        });
      });

      it('should NOT report error when importing exception list item matches an existing list item with same "item_id" and same "list_id"', async () => {
        // create an exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...getCreateExceptionListMinimalSchemaMock(), list_id: 'some-list-id' })
          .expect(200);

        // create an exception list item
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListItemMinimalSchemaMock())
          .expect(200);

        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListItemSchemaMock('some-list-item-id', 'some-list-id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          success_count_exception_list_items: 1,
          success_count_exception_lists: 0,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report duplicate error when importing two exception lists with same "list_id"', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock(),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'More than one exception list with list_id: "detection_list_id" found in imports. The last list will be used.',
                status_code: 400,
              },
              list_id: 'detection_list_id',
            },
          ],
          success: false,
          success_count: 1,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report that it imported an exception list successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListSchemaMock()]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 1,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with one item successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
          success_count_exception_list_items: 1,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with multiple items successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id-2', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 3,
          success_count_exception_list_items: 2,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock('test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 2,
          success_count_exception_list_items: 0,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists and items successfully', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id_2', 'test_list_id'),
              getImportExceptionsListSchemaMock('test_list_id_2'),
              getImportExceptionsListItemSchemaMock('test_item_id_3', 'test_list_id_2'),
              getImportExceptionsListItemSchemaMock('test_item_id_4', 'test_list_id_2'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [],
          success: true,
          success_count: 6,
          success_count_exception_list_items: 4,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report an error when importing an exception list item for which no matching "list_id" exists', async () => {
        const { body } = await supertest
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .attach(
            'file',
            toNdJsonString([getImportExceptionsListItemSchemaMock('1', 'some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors: [
            {
              error: {
                message:
                  'Exception list with list_id: "some-list-id", not found for exception list item with item_id: "1"',
                status_code: 409,
              },
              item_id: '1',
              list_id: 'some-list-id',
            },
          ],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 0,
          success_exception_list_items: false,
          success_exception_lists: true,
          success: false,
          success_count: 0,
        });
      });
    });
  });
};
