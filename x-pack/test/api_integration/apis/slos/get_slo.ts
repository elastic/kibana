/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cleanup } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import type { CreateSLOInput } from '@kbn/slo-schema';

import { FtrProviderContext } from '../../ftr_provider_context';
import { loadTestData } from './helper/load_test_data';
import { SloEsClient } from './helper/es';
import { sloData } from './fixtures/create_slo';

export default function ({ getService }: FtrProviderContext) {
  describe('Get SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const esClient = getService('es');
    const logger = getService('log');
    const retry = getService('retry');
    const slo = getService('slo');
    const sloEsClient = new SloEsClient(esClient);

    let createSLOInput: CreateSLOInput;

    const createSLO = async (requestOverrides?: Record<string, any>) => {
      return await slo.create({
        ...createSLOInput,
        ...requestOverrides,
      });
    };

    before(async () => {
      await slo.deleteAllSLOs();
      await sloEsClient.deleteTestSourceData();
      await loadTestData(getService);
    });

    beforeEach(async () => {
      createSLOInput = sloData;
    });

    afterEach(async () => {
      await slo.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
      await sloEsClient.deleteTestSourceData();
    });

    it('gets slo by id and calculates SLI - occurances rolling', async () => {
      const id = await createSLO({
        groupBy: '*',
      });

      await retry.tryForTime(300 * 1000, async () => {
        const getResponse = await supertestAPI
          .get(`/api/observability/slos/${id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(getResponse.body).eql({
          name: 'Test SLO for api integration',
          description: 'Fixture for api integration tests',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'kbn-data-forge*',
              filter: `system.network.name: eth1`,
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
          settings: { syncDelay: '1m', frequency: '1m' },
          revision: 1,
          enabled: true,
          createdAt: getResponse.body.createdAt,
          updatedAt: getResponse.body.updatedAt,
          version: 2,
          instanceId: '*',
          summary: {
            sliValue: 0.5,
            errorBudget: {
              initial: 0.01,
              consumed: 50,
              remaining: -49,
              isEstimated: false,
            },
            status: 'VIOLATED',
          },
        });
      });
    });

    it('gets slo by id and calculates SLI - occurences calendarAligned', async () => {
      const id = await createSLO({
        groupBy: '*',
        timeWindow: {
          duration: '1w',
          type: 'calendarAligned',
        },
      });

      await retry.tryForTime(300 * 1000, async () => {
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
              good: 'container.cpu.user.pct < 1',
              total: 'container.cpu.user.pct: *',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'occurrences',
          timeWindow: { duration: '1w', type: 'calendarAligned' },
          objective: { target: 0.99 },
          tags: ['test'],
          groupBy: '*',
          id,
          settings: { syncDelay: '1m', frequency: '1m' },
          revision: 1,
          enabled: true,
          createdAt: getResponse.body.createdAt,
          updatedAt: getResponse.body.updatedAt,
          version: 2,
          instanceId: '*',
          summary: {
            sliValue: 0.5,
            errorBudget: {
              initial: 0.01,
              consumed: 50,
              remaining: -49,
              isEstimated: true,
            },
            status: 'VIOLATED',
          },
        });
      });
    });

    it('gets slo by id and calculates SLI - timeslices rolling', async () => {
      const id = await createSLO({
        groupBy: '*',
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.99,
          timesliceTarget: 0.95,
          timesliceWindow: '1m',
        },
      });

      await retry.tryForTime(300 * 1000, async () => {
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
              good: 'container.cpu.user.pct < 1',
              total: 'container.cpu.user.pct: *',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'timeslices',
          timeWindow: { duration: '7d', type: 'rolling' },
          objective: {
            target: 0.99,
            timesliceTarget: 0.95,
            timesliceWindow: '1m',
          },
          tags: ['test'],
          groupBy: '*',
          id,
          settings: { syncDelay: '1m', frequency: '1m' },
          revision: 1,
          enabled: true,
          createdAt: getResponse.body.createdAt,
          updatedAt: getResponse.body.updatedAt,
          version: 2,
          instanceId: '*',
          summary: {
            sliValue: 0.5,
            errorBudget: {
              initial: 0.01,
              consumed: 50,
              remaining: -49,
              isEstimated: false,
            },
            status: 'VIOLATED',
          },
        });
      });
    });

    it('gets slo by id and calculates SLI - timeslices calendarAligned', async () => {
      const id = await createSLO({
        groupBy: '*',
        timeWindow: {
          duration: '1w',
          type: 'calendarAligned',
        },
        budgetingMethod: 'timeslices',
        objective: {
          target: 0.99,
          timesliceTarget: 0.95,
          timesliceWindow: '10m',
        },
      });

      await retry.tryForTime(300 * 1000, async () => {
        const getResponse = await supertestAPI
          .get(`/api/observability/slos/${id}`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(getResponse.body).eql({
          name: 'Test SLO for api integration',
          description: 'Fixture for api integration tests',
          indicator: {
            type: 'sli.kql.custom',
            params: {
              index: 'kbn-data-forge*',
              filter: `system.network.name: eth1`,
              good: 'container.cpu.user.pct < 1',
              total: 'container.cpu.user.pct: *',
              timestampField: '@timestamp',
            },
          },
          budgetingMethod: 'timeslices',
          timeWindow: { duration: '1w', type: 'calendarAligned' },
          objective: {
            target: 0.99,
            timesliceTarget: 0.95,
            timesliceWindow: '10m',
          },
          tags: ['test'],
          groupBy: '*',
          id,
          settings: { syncDelay: '1m', frequency: '1m' },
          revision: 1,
          enabled: true,
          createdAt: getResponse.body.createdAt,
          updatedAt: getResponse.body.updatedAt,
          version: 2,
          instanceId: '*',
          summary: {
            sliValue: 0,
            errorBudget: {
              initial: 0.01,
              consumed: 0.198413,
              remaining: 0.801587,
              isEstimated: false,
            },
            status: 'DEGRADING',
          },
        });
      });
    });

    it('gets slos by query', async () => {
      const id = await createSLO();
      await createSLO({ name: 'test int' });

      await retry.tryForTime(300 * 1000, async () => {
        const response = await supertestAPI
          .get(`/api/observability/slos`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(response.body.results.length).eql(2);

        const searchResponse = await supertestAPI
          .get(`/api/observability/slos?kqlQuery=slo.name%3Aapi*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(searchResponse.body.results.length).eql(1);

        const searchResponse2 = await supertestAPI
          .get(`/api/observability/slos?kqlQuery=slo.name%3Aint`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(searchResponse2.body.results.length).eql(1);

        const searchResponse3 = await supertestAPI
          .get(`/api/observability/slos?kqlQuery=slo.name%3Aint*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(searchResponse3.body.results.length).eql(2);

        const searchResponse4 = await supertestAPI
          .get(`/api/observability/slos?kqlQuery=int*`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        expect(searchResponse4.body.results.length).eql(2);

        const instanceResponse = await supertestAPI
          .get(`/internal/observability/slos/${id}/_instances`)
          .set('kbn-xsrf', 'true')
          .send()
          .expect(200);

        // expect 3 instances to be created
        expect(instanceResponse.body.groupBy).eql('tags');
        expect(instanceResponse.body.instances.sort()).eql(['1', '2', '3']);
      });
    });

    it('gets slo definitions', async () => {
      const id = await createSLO();
      const secondId = await createSLO({ name: 'test name int' });
      const response = await supertestAPI
        .get(`/api/observability/slos/_definitions`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

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
                good: 'container.cpu.user.pct < 1',
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
              duration: '7d',
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
                good: 'container.cpu.user.pct < 1',
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
              duration: '7d',
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
  });
}
