/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION_INTERNAL } from '@kbn/data-views-plugin/server/constants';
import { EXISTING_INDICES_PATH } from '@kbn/data-views-plugin/common/constants';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const randomness = getService('randomness');
  const svlCommonApi = getService('svlCommonApi');

  describe('_existing_indices params', () => {
    before(() =>
      esArchiver.load('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );
    after(() =>
      esArchiver.unload('test/api_integration/fixtures/es_archiver/index_patterns/basic_index')
    );

    it('requires a query param', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({})
        .expect(400));

    it('accepts indices param as single index string', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({
          indices: 'filebeat-*',
        })
        .expect(200));

    it('accepts indices param as single index array', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({
          indices: ['filebeat-*'],
        })
        .expect(200));

    it('accepts indices param', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({
          indices: ['filebeat-*', 'packetbeat-*'],
        })
        .expect(200));

    it('rejects unexpected query params', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({
          [randomness.word()]: randomness.word(),
        })
        .expect(400));

    it('rejects a comma-separated list of indices', () =>
      supertest
        .get(EXISTING_INDICES_PATH)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
        // TODO: API requests in Serverless require internal request headers
        .set(svlCommonApi.getInternalRequestHeader())
        .query({
          indices: 'filebeat-*,packetbeat-*',
        })
        .expect(400));
  });
}
