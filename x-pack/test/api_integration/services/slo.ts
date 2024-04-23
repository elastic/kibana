/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CreateSLOInput, FindSLODefinitionsResponse } from '@kbn/slo-schema';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '@kbn/slo-plugin/common/constants';
import { waitForIndexToBeEmpty } from '../apis/slos/helper/wait_for_index_state';
import { FtrProviderContext } from '../ftr_provider_context';

export function SloApiProvider({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');

  return {
    async create(params: CreateSLOInput) {
      const slo = await supertest
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(params)
        .expect(200);

      const { id } = slo.body;

      const reqBody = [{ id: `slo-${id}-1` }, { id: `slo-summary-${id}-1` }];
      await supertest
        .post(`/internal/transform/schedule_now_transforms`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send(reqBody)
        .expect(200);

      return id;
    },
    async deleteAllSLOs() {
      const response = await supertest
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);
      for (const { id } of (response.body as FindSLODefinitionsResponse).results) {
        await supertest
          .delete(`/api/observability/slos/${id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(204);
      }
      await waitForIndexToBeEmpty({ esClient, indexName: SLO_SUMMARY_DESTINATION_INDEX_NAME });
    },
  };
}
