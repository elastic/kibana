/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { SO_SLO_TYPE } from '@kbn/observability-plugin/server/saved_objects';

import { FtrProviderContext } from '../../ftr_provider_context';
import { getFixtureJson } from './helper/get_fixture_json';

export default function ({ getService }: FtrProviderContext) {
  describe('Get SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');

    let _createSLOInput: CreateSLOInput;
    let createSLOInput: CreateSLOInput;

    before(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      _createSLOInput = getFixtureJson('create_slo');
    });

    beforeEach(() => {
      createSLOInput = _createSLOInput;
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
    });

    it('gets slo by id', async () => {
      const request = createSLOInput;

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      const getResponse = await supertestAPI
        .get(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      // expect summary transform to be created
      expect(getResponse.body).eql({
        name: 'Test SLO for api integration',
        description: 'Fixture for api integration tests',
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: 'service-logs*',
            filter: 'dataset : *',
            good: 'latency < 90',
            total: 'latency: *',
            timestampField: '@timestamp',
          },
        },
        budgetingMethod: 'occurrences',
        timeWindow: { duration: '30d', type: 'rolling' },
        objective: { target: 0.99 },
        tags: ['test'],
        groupBy: 'host',
        id,
        settings: { syncDelay: '1m', frequency: '1m' },
        revision: 1,
        enabled: true,
        createdAt: getResponse.body.createdAt,
        updatedAt: getResponse.body.updatedAt,
        version: 2,
        instanceId: '*',
        summary: {
          sliValue: -1,
          errorBudget: { initial: 0.01, consumed: 0, remaining: 1, isEstimated: false },
          status: 'NO_DATA',
        },
      });
    });

    it('gets slo instances', async () => {
      const request = createSLOInput;

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      const instanceResponse = await supertestAPI
        .get(`/internal/observability/slos/${id}/_instances`)
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      // expect summary transform to be created
      expect(instanceResponse.body).eql({ groupBy: 'host', instances: [] });
    });
  });
}
