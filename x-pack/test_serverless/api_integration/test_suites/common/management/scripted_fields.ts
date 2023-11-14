/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DATA_VIEW_PATH } from '@kbn/data-views-plugin/server';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');

  describe('scripted fields disabled', function () {
    before(async () => {
      // TODO: We're running into a 'Duplicate data view: basic_index'
      // error in Serverless, so make sure to clean up first
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index');
    });

    after(async () => {
      await esArchiver.unload(
        'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
      );
    });
    it('scripted fields are ignored when disabled', async () => {
      const response = await supertest
        .post(DATA_VIEW_PATH)
        .set('kbn-xsrf', 'some-xsrf-token')
        .send({
          data_view: {
            title: 'basic_index',
            fields: {
              foo_scripted: {
                name: 'foo_scripted',
                type: 'string',
                scripted: true,
                script: "doc['field_name'].value",
              },
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.data_view.fields.foo_scripted).toBeUndefined();
    });
  });
}
