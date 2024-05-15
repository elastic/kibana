/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { cleanup } from '@kbn/infra-forge';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { FtrProviderContext } from '../../ftr_provider_context';
import { sloData } from './fixtures/create_slo';
import { loadTestData } from './helper/load_test_data';

export default function ({ getService }: FtrProviderContext) {
  describe('Create SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const sloApi = getService('sloApi');
    const retry = getService('retry');
    const logger = getService('log');

    let createSLOInput: CreateSLOInput;

    before(async () => {
      await loadTestData(getService);
      await sloApi.deleteAllSLOs();
    });

    beforeEach(() => {
      createSLOInput = sloData;
    });

    afterEach(async () => {
      await sloApi.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloApi.deleteTestSourceData();
    });

    it('creates instanceId for SLOs with multi groupBy', async () => {
      createSLOInput.groupBy = ['system.network.name', 'event.dataset'];

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await retry.tryForTime(300 * 1000, async () => {
        const response = await esClient.search(getEsQuery(id));

        // @ts-ignore
        expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql(
          'eth1,system.network'
        );
      });
    });

    it('creates instanceId for SLOs with single groupBy', async () => {
      createSLOInput.groupBy = 'system.network.name';

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await retry.tryForTime(300 * 1000, async () => {
        const response = await esClient.search(getEsQuery(id));

        // @ts-ignore
        expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('eth1');
      });
    });

    it('creates instanceId for SLOs without groupBy ([])', async () => {
      createSLOInput.groupBy = [];

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await retry.tryForTime(300 * 1000, async () => {
        const response = await esClient.search(getEsQuery(id));

        // @ts-ignore
        expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
      });
    });

    it('creates instanceId for SLOs without groupBy (["*"])', async () => {
      createSLOInput.groupBy = ['*'];

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await retry.tryForTime(300 * 1000, async () => {
        const response = await esClient.search(getEsQuery(id));

        // @ts-ignore
        expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
      });
    });

    it('creates instanceId for SLOs without groupBy ("")', async () => {
      createSLOInput.groupBy = '';

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .set('x-elastic-internal-origin', 'foo')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await retry.tryForTime(300 * 1000, async () => {
        const response = await esClient.search(getEsQuery(id));

        // @ts-ignore
        expect(response.aggregations?.last_doc.hits?.hits[0]._source.slo.instanceId).eql('*');
      });
    });
  });
}

const getEsQuery = (id: string) => ({
  index: '.slo-observability.sli-v3*',
  size: 0,
  query: {
    bool: {
      filter: [
        {
          term: {
            'slo.id': id,
          },
        },
      ],
    },
  },
  aggs: {
    last_doc: {
      top_hits: {
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
        _source: {
          includes: ['slo.instanceId'],
        },
        size: 1,
      },
    },
  },
});
