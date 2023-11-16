/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { FIELDS_FOR_WILDCARD_PATH } from '@kbn/data-views-plugin/common/constants';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const svlCommonApi = getService('svlCommonApi');

  describe('conflicts', function () {
    this.tags('failsOnMKI');
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/conflicts')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/conflicts')
    );

    it('flags fields with mismatched types as conflicting', () =>
      supertest
        .get(FIELDS_FOR_WILDCARD_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({ pattern: 'logs-*' })
        .expect(200)
        .then((resp) => {
          expect(resp.body).to.eql({
            fields: [
              {
                name: '@timestamp',
                type: 'date',
                esTypes: ['date'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'number_conflict',
                type: 'number',
                esTypes: ['float', 'integer'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'string_conflict',
                type: 'string',
                esTypes: ['keyword', 'text'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: true,
                metadata_field: false,
              },
              {
                name: 'success',
                type: 'conflict',
                esTypes: ['keyword', 'boolean'],
                aggregatable: true,
                searchable: true,
                readFromDocValues: false,
                conflictDescriptions: {
                  boolean: ['logs-2017.01.02'],
                  keyword: ['logs-2017.01.01'],
                },
                metadata_field: false,
              },
            ],
            indices: ['logs-2017.01.01', 'logs-2017.01.02'],
          });
        }));
  });
}
