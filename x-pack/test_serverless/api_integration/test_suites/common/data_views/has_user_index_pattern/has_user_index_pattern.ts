/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import {
  INITIAL_REST_VERSION,
  INITIAL_REST_VERSION_INTERNAL,
} from '@kbn/data-views-plugin/server/constants';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { configArray } from '../constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const svlCommonApi = getService('svlCommonApi');
  const kibanaServer = getService('kibanaServer');

  describe('has user index pattern API', () => {
    configArray.forEach((config) => {
      describe(config.name, () => {
        beforeEach(async () => {
          // TODO: emptyKibanaIndex fails in Serverless with
          // "index_not_found_exception: no such index [.kibana_ingest]",
          // so it was switched to `savedObjects.cleanStandardList()`
          await kibanaServer.savedObjects.cleanStandardList();
          if (await es.indices.exists({ index: 'metrics-test' })) {
            await es.indices.delete({ index: 'metrics-test' });
          }

          if (await es.indices.exists({ index: 'logs-test' })) {
            await es.indices.delete({ index: 'logs-test' });
          }
        });

        const servicePath = `${config.basePath}/has_user_${config.serviceKey}`;

        it('should return false if no index patterns', async () => {
          // Make sure all saved objects including data views are cleared
          // TODO: emptyKibanaIndex fails in Serverless with
          // "index_not_found_exception: no such index [.kibana_ingest]",
          // so it was switched to `savedObjects.cleanStandardList()`
          await kibanaServer.savedObjects.cleanStandardList();
          const response = await supertest
            .get(servicePath)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(false);
        });

        it('should return true if has index pattern with user data', async () => {
          await esArchiver.load(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );
          await supertest
            .post(config.path)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              override: true,
              [config.serviceKey]: {
                title: 'basic_index',
              },
            });

          const response = await supertest
            .get(servicePath)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);

          await esArchiver.unload(
            'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
          );
        });

        it('should return true if has user index pattern without data', async () => {
          await supertest
            .post(config.path)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader())
            .send({
              override: true,
              [config.serviceKey]: {
                title: 'basic_index',
                allowNoIndex: true,
              },
            });

          const response = await supertest
            .get(servicePath)
            .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION_INTERNAL)
            // TODO: API requests in Serverless require internal request headers
            .set(svlCommonApi.getInternalRequestHeader());
          expect(response.status).to.be(200);
          expect(response.body.result).to.be(true);
        });
      });
    });
  });
}
