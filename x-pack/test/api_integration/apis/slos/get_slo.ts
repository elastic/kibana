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
import { loadTestData } from './helper/load_test_data';

export default function ({ getService }: FtrProviderContext) {
  describe('Get SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const logger = getService('log');

    let _createSLOInput: CreateSLOInput;
    let createSLOInput: CreateSLOInput;
    let id: string;

    before(async () => {
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
      _createSLOInput = getFixtureJson('create_slo');
      await loadTestData(getService);
    });

    beforeEach(async () => {
      createSLOInput = _createSLOInput;
      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(_createSLOInput)
        .expect(200);

      id = apiResponse.body.id;
    });

    afterEach(async () => {
      await kibanaServer.savedObjects.clean({ types: [SO_SLO_TYPE] });
    });

    after(async () => {
      await cleanup({ esClient, logger });
    });

    it('gets slo by id', async () => {
      const getResponse = await supertestAPI
        .get(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // expect summary transform to be created
      expect(getResponse.body).eql({
        name: 'Test SLO for api integration',
        description: 'Fixture for api integration tests',
        indicator: {
          type: 'sli.kql.custom',
          params: {
            index: 'kbn-data-forge*',
            filter: `system.network.name: eth1`,
            good: 'container.cpu.user.pct < 6',
            total: 'container.cpu.user.pct: *',
            timestampField: '@timestamp',
          },
        },
        budgetingMethod: 'occurrences',
        timeWindow: { duration: '30d', type: 'rolling' },
        objective: { target: 0.99 },
        tags: ['test'],
        groupBy: 'tags',
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

    // it('gets slos by query', async () => {
    //   const secondSLO = await supertestAPI
    //     .post('/api/observability/slos')
    //     .set('kbn-xsrf', 'true')
    //     .send({
    //       ...createSLOInput,
    //       name: 'test name int',
    //     })
    //     .expect(200);

    //   const { id: secondId } = secondSLO.body;

    //   const response = await supertestAPI
    //     .get(`/api/observability/slos`)
    //     .set('kbn-xsrf', 'true')
    //     .send()
    //     .expect(200);

    //   expect(response.body.total).eql(2);

    //   const searchResponse = await supertestAPI
    //     .get(`/api/observability/slos?search=api`)
    //     .set('kbn-xsrf', 'true')
    //     .send()
    //     .expect(200);

    //   expect(searchResponse.body.total).eql(1);

    //   const searchResponse2 = await supertestAPI
    //     .get(`/api/observability/slos?search=int`)
    //     .set('kbn-xsrf', 'true')
    //     .send()
    //     .expect(200);

    //   expect(searchResponse2.body.total).eql(1);

    //   const searchResponse3 = await supertestAPI
    //     .get(`/api/observability/slos/_definitions?search=int*`)
    //     .set('kbn-xsrf', 'true')
    //     .send()
    //     .expect(200);

    //   expect(searchResponse3.body.total).eql(2);
    // });

    it('gets slo definitions', async () => {
      const secondSLO = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send({
          ...createSLOInput,
          name: 'test name int',
        })
        .expect(200);
      const response = await supertestAPI
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      const { id: secondId } = secondSLO.body;

      expect(response.body).eql({
        page: 1,
        perPage: 100,
        results: [
          {
            budgetingMethod: 'occurrences',
            createdAt: response.body.results[0].createdAt,
            description: 'Fixture for api integration tests',
            enabled: true,
            groupBy: 'tags',
            id,
            indicator: {
              params: {
                filter: 'system.network.name: eth1',
                good: 'container.cpu.user.pct < 6',
                index: 'kbn-data-forge*',
                timestampField: '@timestamp',
                total: 'container.cpu.user.pct: *',
              },
              type: 'sli.kql.custom',
            },
            name: 'Test SLO for api integration',
            objective: {
              target: 0.99,
            },
            revision: 1,
            settings: {
              frequency: '1m',
              syncDelay: '1m',
            },
            tags: ['test'],
            timeWindow: {
              duration: '30d',
              type: 'rolling',
            },
            updatedAt: response.body.results[0].updatedAt,
            version: 2,
          },
          {
            budgetingMethod: 'occurrences',
            createdAt: response.body.results[1].createdAt,
            description: 'Fixture for api integration tests',
            enabled: true,
            groupBy: 'tags',
            id: secondId,
            indicator: {
              params: {
                filter: 'system.network.name: eth1',
                good: 'container.cpu.user.pct < 6',
                index: 'kbn-data-forge*',
                timestampField: '@timestamp',
                total: 'container.cpu.user.pct: *',
              },
              type: 'sli.kql.custom',
            },
            name: 'test name int',
            objective: {
              target: 0.99,
            },
            revision: 1,
            settings: {
              frequency: '1m',
              syncDelay: '1m',
            },
            tags: ['test'],
            timeWindow: {
              duration: '30d',
              type: 'rolling',
            },
            updatedAt: response.body.results[1].updatedAt,
            version: 2,
          },
        ],
        total: 2,
      });

      // can search by name
      const searchResponse = await supertestAPI
        .get(`/api/observability/slos/_definitions?search=api`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(searchResponse.body.total).eql(1);

      const searchResponse2 = await supertestAPI
        .get(`/api/observability/slos/_definitions?search=int`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(searchResponse2.body.total).eql(1);

      const searchResponse3 = await supertestAPI
        .get(`/api/observability/slos/_definitions?search=int*`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(searchResponse3.body.total).eql(2);
    });

    it('gets slo instances', async () => {
      await new Promise((resolve) => setTimeout(resolve, 120000));

      const instanceResponse = await supertestAPI
        .get(`/internal/observability/slos/${id}/_instances`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      // expect summary transform to be created
      expect(instanceResponse.body).eql({
        groupBy: 'tags',
        instances: ['1', '2', '3'],
      });
    });
  });
}
