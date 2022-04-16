/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';

import {
  DEPRECATION_LOGS_INDEX,
  DEPRECATION_LOGS_ORIGIN_FIELD,
  APPS_WITH_DEPRECATION_LOGS,
  API_BASE_PATH,
} from '@kbn/upgrade-assistant-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';
import { initHelpers } from './es_deprecation_logs.helpers';

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');

  const { createDeprecationLog, deleteDeprecationLogs } = initHelpers(getService);

  describe('Elasticsearch deprecation logs', function () {
    this.onlyEsVersion('<=7');

    describe('GET /api/upgrade_assistant/deprecation_logging', () => {
      describe('/count', () => {
        it('should filter out the deprecation from Elastic products', async () => {
          // We add a custom deprecation to make sure our filter is working
          // and make sure that the count of deprecation without filter is greater
          // than the total of deprecations
          const IS_ELASTIC_PRODUCT = true;
          const doc1 = await createDeprecationLog();
          const doc2 = await createDeprecationLog(IS_ELASTIC_PRODUCT);
          const checkpoint = '2000-01-01T00:00:00.000Z';

          const allDeprecations = (
            await es.search({
              index: DEPRECATION_LOGS_INDEX,
              size: 10000,
            })
          ).hits.hits;

          const nonElasticProductDeprecations = allDeprecations.filter(
            (deprecation) =>
              !APPS_WITH_DEPRECATION_LOGS.includes(
                (deprecation._source as any)[DEPRECATION_LOGS_ORIGIN_FIELD]
              )
          );

          const { body: apiRequestResponse } = await supertest
            .get(`${API_BASE_PATH}/deprecation_logging/count`)
            .query({
              from: checkpoint,
            })
            .set('kbn-xsrf', 'xxx')
            .expect(200);

          expect(nonElasticProductDeprecations.length).be.below(allDeprecations.length);
          expect(apiRequestResponse.count).be(nonElasticProductDeprecations.length);

          await deleteDeprecationLogs([doc1, doc2]);
        });
      });
    });
  });
}
