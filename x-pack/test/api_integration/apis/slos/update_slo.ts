/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { cleanup } from '@kbn/infra-forge';
import expect from '@kbn/expect';
import type { CreateSLOInput } from '@kbn/slo-schema';
import { SO_SLO_TYPE } from '@kbn/slo-plugin/server/saved_objects';

import { FtrProviderContext } from '../../ftr_provider_context';
import { loadTestData } from './helper/load_test_data';
import { sloData } from './fixtures/create_slo';

export default function ({ getService }: FtrProviderContext) {
  describe('Update SLOs', function () {
    this.tags('skipCloud');

    const supertestAPI = getService('supertest');
    const kibanaServer = getService('kibanaServer');
    const esClient = getService('es');
    const logger = getService('log');
    const slo = getService('slo');

    let createSLOInput: CreateSLOInput;

    before(async () => {
      await slo.deleteAllSLOs();
      await loadTestData(getService);
    });

    beforeEach(() => {
      createSLOInput = sloData;
    });

    afterEach(async () => {
      await slo.deleteAllSLOs();
    });

    after(async () => {
      await cleanup({ esClient, logger });
    });

    it('updates the SO and transforms', async () => {
      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(createSLOInput)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...createSLOInput,
          groupBy: 'hosts',
        })
        .expect(200);

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      expect(savedObject.saved_objects[0].attributes).eql({
        budgetingMethod: 'occurrences',
        updatedAt: savedObject.saved_objects[0].attributes.updatedAt,
        createdAt: savedObject.saved_objects[0].attributes.createdAt,
        description: 'Fixture for api integration tests',
        enabled: true,
        groupBy: 'hosts',
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
        revision: 2,
        settings: {
          frequency: '1m',
          syncDelay: '1m',
        },
        tags: ['test'],
        timeWindow: {
          duration: '7d',
          type: 'rolling',
        },
        version: 2,
      });

      const rollUpTransformResponse = await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect roll up transform to be created
      expect(rollUpTransformResponse.body).eql({
        count: 1,
        transforms: [
          {
            id: `slo-${id}-2`,
            authorization: { roles: ['superuser'] },
            version: '10.0.0',
            create_time: rollUpTransformResponse.body.transforms[0].create_time,
            source: {
              index: ['kbn-data-forge*'],
              query: {
                bool: {
                  filter: [
                    { range: { '@timestamp': { gte: 'now-7d/d' } } },
                    {
                      bool: {
                        should: [
                          {
                            match: {
                              'system.network.name': 'eth1',
                            },
                          },
                        ],
                        minimum_should_match: 1,
                      },
                    },
                    {
                      exists: {
                        field: 'hosts',
                      },
                    },
                  ],
                },
              },
              runtime_mappings: {
                'slo.id': {
                  type: 'keyword',
                  script: { source: `emit('${id}')` },
                },
                'slo.revision': { type: 'long', script: { source: 'emit(2)' } },
              },
            },
            dest: {
              index: '.slo-observability.sli-v3.1',
              pipeline: '.slo-observability.sli.pipeline-v3.1',
            },
            frequency: '1m',
            sync: { time: { field: '@timestamp', delay: '1m' } },
            pivot: {
              group_by: {
                'slo.id': { terms: { field: 'slo.id' } },
                'slo.revision': { terms: { field: 'slo.revision' } },
                'slo.groupings.hosts': { terms: { field: 'hosts' } },
                '@timestamp': { date_histogram: { field: '@timestamp', fixed_interval: '1m' } },
              },
              aggregations: {
                'slo.numerator': {
                  filter: {
                    bool: {
                      should: [{ range: { 'container.cpu.user.pct': { lt: '1' } } }],
                      minimum_should_match: 1,
                    },
                  },
                },
                'slo.denominator': {
                  filter: {
                    bool: {
                      should: [{ exists: { field: 'container.cpu.user.pct' } }],
                      minimum_should_match: 1,
                    },
                  },
                },
              },
            },
            description: `Rolled-up SLI data for SLO: Test SLO for api integration [id: ${id}, revision: 2]`,
            settings: { deduce_mappings: false, unattended: true },
            _meta: { version: 3.1, managed: true, managed_by: 'observability' },
          },
        ],
      });

      const summaryTransform = await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect summary transform to be created
      expect(summaryTransform.body).eql({
        count: 1,
        transforms: [
          {
            id: `slo-summary-${id}-2`,
            authorization: { roles: ['superuser'] },
            version: '10.0.0',
            create_time: summaryTransform.body.transforms[0].create_time,
            source: {
              index: ['.slo-observability.sli-v3*'],
              query: {
                bool: {
                  filter: [
                    { range: { '@timestamp': { gte: 'now-7d/m', lte: 'now/m' } } },
                    { term: { 'slo.id': id } },
                    { term: { 'slo.revision': 2 } },
                  ],
                },
              },
            },
            dest: {
              index: '.slo-observability.summary-v3.1',
              pipeline: `.slo-observability.summary.pipeline-${id}-2`,
            },
            frequency: '1m',
            sync: { time: { field: 'event.ingested', delay: '65s' } },
            pivot: {
              group_by: {
                'slo.id': { terms: { field: 'slo.id' } },
                'slo.revision': { terms: { field: 'slo.revision' } },
                'slo.instanceId': { terms: { field: 'slo.instanceId' } },
                'slo.groupings.hosts': {
                  terms: { field: 'slo.groupings.hosts' },
                },
                'service.name': { terms: { field: 'service.name', missing_bucket: true } },
                'service.environment': {
                  terms: { field: 'service.environment', missing_bucket: true },
                },
                'transaction.name': { terms: { field: 'transaction.name', missing_bucket: true } },
                'transaction.type': { terms: { field: 'transaction.type', missing_bucket: true } },
              },
              aggregations: {
                goodEvents: { sum: { field: 'slo.numerator' } },
                totalEvents: { sum: { field: 'slo.denominator' } },
                sliValue: {
                  bucket_script: {
                    buckets_path: { goodEvents: 'goodEvents', totalEvents: 'totalEvents' },
                    script:
                      'if (params.totalEvents == 0) { return -1 } else if (params.goodEvents >= params.totalEvents) { return 1 } else { return params.goodEvents / params.totalEvents }',
                  },
                },
                errorBudgetInitial: { bucket_script: { buckets_path: {}, script: '1 - 0.99' } },
                errorBudgetConsumed: {
                  bucket_script: {
                    buckets_path: {
                      sliValue: 'sliValue',
                      errorBudgetInitial: 'errorBudgetInitial',
                    },
                    script:
                      'if (params.sliValue == -1) { return 0 } else { return (1 - params.sliValue) / params.errorBudgetInitial }',
                  },
                },
                errorBudgetRemaining: {
                  bucket_script: {
                    buckets_path: { errorBudgetConsumed: 'errorBudgetConsumed' },
                    script: '1 - params.errorBudgetConsumed',
                  },
                },
                statusCode: {
                  bucket_script: {
                    buckets_path: {
                      sliValue: 'sliValue',
                      errorBudgetRemaining: 'errorBudgetRemaining',
                    },
                    script: {
                      source:
                        'if (params.sliValue == -1) { return 0 } else if (params.sliValue >= 0.99) { return 4 } else if (params.errorBudgetRemaining > 0) { return 2 } else { return 1 }',
                    },
                  },
                },
                latestSliTimestamp: { max: { field: '@timestamp' } },
              },
            },
            description: `Summarise the rollup data of SLO: Test SLO for api integration [id: ${id}, revision: 2].`,
            settings: { deduce_mappings: false, unattended: true },
            _meta: { version: 3.1, managed: true, managed_by: 'observability' },
          },
        ],
      });
    });

    it('updates an existing slo and does not update transforms when relevant fields are changed', async () => {
      const request = createSLOInput;

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change name
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          name: 'test name',
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change description
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          description: 'test description',
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change tags
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          tags: ['testTag'],
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);
    });

    it('updates an existing slo and updates transforms when relevant fields are changed', async () => {
      const request = createSLOInput;

      const apiResponse = await supertestAPI
        .post('/api/observability/slos')
        .set('kbn-xsrf', 'true')
        .send(request)
        .expect(200);

      expect(apiResponse.body).property('id');

      const { id } = apiResponse.body;

      const savedObject = await kibanaServer.savedObjects.find({
        type: SO_SLO_TYPE,
      });

      expect(savedObject.saved_objects.length).eql(1);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change group by
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          groupBy: 'hosts',
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change indicator
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          indicator: {
            ...request.indicator,
            params: {
              ...request.indicator.params,
              index: 'test-index-*',
            },
          },
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-2`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-3`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-3`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change time window
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          timeWindow: {
            ...request.timeWindow,
            duration: '7d',
          },
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-3`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-3`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-4`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-4`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change objective
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          objective: {
            target: 0.97,
          },
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-4`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-4`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-5`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-5`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change budgetingMethod
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          budgetingMethod: 'timeslices',
          objective: {
            target: 0.99,
            timesliceTarget: 0.95,
            timesliceWindow: '1m',
          },
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-5`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-5`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-6`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-6`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // change settings
      await supertestAPI
        .put(`/api/observability/slos/${id}`)
        .set('kbn-xsrf', 'true')
        .send({
          ...request,
          settings: {
            frequency: '2m',
            syncDelay: '5m',
          },
        })
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-6`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-6`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(404);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-7`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-7`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);
    });
  });
}
