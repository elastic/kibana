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
  exceptionsToNdJsonString,
  getImportExceptionsListItemSchemaMock,
  getImportExceptionsListSchemaMock,
} from '../../../../plugins/lists/common/schemas/request/import_exception_list_schema.mock';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { deleteAllExceptions } from '../../utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutLog = getService('supertestWithoutAuth');
  const supertest = getService('supertest');
  const log = getService('log');

  describe.only('import_exceptions', () => {
    beforeEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('"overwrite" is false', () => {
      it('should report duplicate error when importing exception list matches an existing list with same "list_id"', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([getImportExceptionsListSchemaMock('some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [
            {
              error: {
                message: 'list_id: "some-list-id" already exists',
                status_code: 409,
              },
              list_id: 'some-list-id',
            },
          ],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 0,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report duplicate error when importing two exception lists with same "list_id"', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock(),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [
            {
              error: {
                message:
                  'More than one exception list with list_id: "detection_list_id" found in imports',
                status_code: 400,
              },
              list_id: 'detection_list_id',
            },
          ],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report that it imported an exception list successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([getImportExceptionsListSchemaMock()]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with one item successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 1,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with multiple items successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id-2', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 2,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock('test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists and items successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=false`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
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
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 4,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
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

        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([getImportExceptionsListSchemaMock('some-list-id')]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should NOT report duplicate error when importing exception list item matches an existing list item with same "item_id"', async () => {
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

        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListItemSchemaMock('some-list-item-id', 'some-list-id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 1,
          success_count_exception_lists: 0,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report duplicate error when importing two exception lists with same "list_id"', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock(),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [
            {
              error: {
                message:
                  'More than one exception list with list_id: "detection_list_id" found in imports',
                status_code: 400,
              },
              list_id: 'detection_list_id',
            },
          ],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: false,
        });
      });

      it('should report that it imported an exception list successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([getImportExceptionsListSchemaMock()]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with one item successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 1,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported an exception list with multiple items successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock('test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id', 'test_list_id'),
              getImportExceptionsListItemSchemaMock('test_item_id-2', 'test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 2,
          success_count_exception_lists: 1,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
              getImportExceptionsListSchemaMock(),
              getImportExceptionsListSchemaMock('test_list_id'),
            ]),
            'exceptions.ndjson'
          )
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect(200);

        expect(body).to.eql({
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 0,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });

      it('should report that it imported multiple exception lists and items successfully', async () => {
        const { body } = await supertestWithoutLog
          .post(`${EXCEPTION_LIST_URL}/_import?overwrite=true`)
          .set('kbn-xsrf', 'true')
          .auth('elastic', 'changeme')
          .attach(
            'file',
            exceptionsToNdJsonString([
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
          errors_exception_list_items: [],
          errors_exception_lists: [],
          success_count_exception_list_items: 4,
          success_count_exception_lists: 2,
          success_exception_list_items: true,
          success_exception_lists: true,
        });
      });
    });
  });
};
