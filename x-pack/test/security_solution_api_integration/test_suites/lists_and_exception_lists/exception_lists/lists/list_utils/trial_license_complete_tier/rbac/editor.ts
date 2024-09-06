/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXCEPTION_LIST_ITEM_URL,
  EXCEPTION_LIST_URL,
  INTERNAL_EXCEPTION_FILTER,
} from '@kbn/securitysolution-list-constants';
import {
  getCreateExceptionListDetectionSchemaMock,
  getCreateExceptionListMinimalSchemaMock,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_schema.mock';

import TestAgent from 'supertest/lib/agent';
import {
  getCreateExceptionListItemMinimalSchemaMock,
  getCreateExceptionListItemMinimalSchemaMockWithoutId,
} from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { getExceptionFilterFromExceptionIdsSchemaMock } from '@kbn/lists-plugin/common/schemas/request/get_exception_filter_schema.mock';
import { deleteAllExceptions } from '../../../../../utils';

import { FtrProviderContext } from '../../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  let editor: TestAgent;

  describe('@serverless @serverlessQA editor exception list API behaviors', () => {
    before(async () => {
      editor = await utils.createSuperTest('editor');
    });

    afterEach(async () => {
      await deleteAllExceptions(supertest, log);
    });

    describe('duplicate list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 200 for editor', async () => {
        await editor
          .post(
            `${EXCEPTION_LIST_URL}/_duplicate?list_id=${
              getCreateExceptionListDetectionSchemaMock().list_id
            }&namespace_type=single&include_expired_exceptions=true`
          )
          .set('kbn-xsrf', 'true')
          .expect(200);
      });
    });

    describe('find list', () => {
      beforeEach(async () => {
        // Create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);
      });

      it('should return 200 for editor', async () => {
        await editor.get(`${EXCEPTION_LIST_URL}/_find`).set('kbn-xsrf', 'true').send().expect(200);
      });
    });

    describe('get list filter', () => {
      it('should return 200 for editor', async () => {
        // create exception list
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListDetectionSchemaMock())
          .expect(200);

        // create exception list items
        await supertest
          .post(EXCEPTION_LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({
            ...getCreateExceptionListItemMinimalSchemaMockWithoutId(),
            list_id: getCreateExceptionListDetectionSchemaMock().list_id,
            item_id: '1',
            entries: [
              { field: 'host.name', value: 'some host', operator: 'included', type: 'match' },
            ],
          })
          .expect(200);

        await editor
          .post(`${INTERNAL_EXCEPTION_FILTER}`)
          .set('kbn-xsrf', 'true')
          .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1')
          .send(getExceptionFilterFromExceptionIdsSchemaMock())
          .expect(200);
      });
    });

    describe('get list summary', () => {
      it('should return 200 for editor', async () => {
        await supertest
          .post(EXCEPTION_LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateExceptionListMinimalSchemaMock())
          .expect(200);

        const item = getCreateExceptionListItemMinimalSchemaMock();

        for (const os of ['windows', 'linux', 'macos']) {
          await supertest
            .post(EXCEPTION_LIST_ITEM_URL)
            .set('kbn-xsrf', 'true')
            .send({ ...item, os_types: [os], item_id: `${item.item_id}-${os}` })
            .expect(200);
        }

        await supertest
          .get(
            `${EXCEPTION_LIST_URL}/summary?list_id=${
              getCreateExceptionListMinimalSchemaMock().list_id
            }`
          )
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);
      });
    });
  });
};
