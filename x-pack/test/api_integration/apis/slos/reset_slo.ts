/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cleanup } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';

import { FtrProviderContext } from '../../ftr_provider_context';
import { loadTestData } from './helper/load_test_data';
import { SloEsClient } from './helper/es';

export default function ({ getService }: FtrProviderContext) {
  describe('Reset SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const logger = getService('log');
    const slo = getService('slo');
    const sloEsClient = new SloEsClient(esClient);

    before(async () => {
      await sloEsClient.deleteTestSourceData();
      await slo.deleteAllSLOs();
      await loadTestData(getService);
    });

    afterEach(async () => {
      await slo.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloEsClient.deleteTestSourceData();
    });

    it('updates the SO and transforms', async () => {
      // create mock old SLO
      const id = 'bdaeccdd-dc63-4138-a1d5-92c075f88087';
      await kibanaServer.savedObjects.clean({
        types: [SO_SLO_TYPE],
      });
      await kibanaServer.savedObjects.create({
        type: SO_SLO_TYPE,
        overwrite: true,
        id,
        attributes: {
          name: 'Test SLO for api integration',
          description: 'Fixture for api integration tests',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'kbn-data-forge*',
              filter: 'system.network.name: eth1',
              good: 'container.cpu.user.pct < 1',
              total: 'container.cpu.user.pct: *',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'occurrences',
          timeWindow: { duration: '7d', type: 'rolling' },
          objective: { target: 0.99 },
          tags: ['test'],
          groupBy: '*',
          id,
          settings: {
            syncDelay: '1m',
            frequency: '1m',
          },
          revision: 1,
          enabled: true,
          createdAt: '2023-12-14T01:12:35.638Z',
          updatedAt: '2023-12-14T01:12:35.638Z',
          version: 1,
        },
      });

      const responseBeforeReset = await supertestAPI
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(responseBeforeReset.body.results[0].version).eql(1);

      await supertestAPI
        .post(`/api/observability/slos/${id}/_reset`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const responseAfterReset = await supertestAPI
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(responseAfterReset.body.results[0].version).eql(2);
    });
  });
}
