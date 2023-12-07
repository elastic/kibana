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
  describe('Create SLOs', function () {
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

    it('creates a new slo and transforms', async () => {
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

      expect(savedObject.saved_objects[0].attributes).eql({
        budgetingMethod: 'occurrences',
        updatedAt: savedObject.saved_objects[0].attributes.updatedAt,
        createdAt: savedObject.saved_objects[0].attributes.createdAt,
        description: 'Fixture for api integration tests',
        enabled: true,
        groupBy: 'host',
        id,
        indicator: {
          params: {
            filter: 'dataset : *',
            good: 'latency < 90',
            index: 'service-logs*',
            timestampField: '@timestamp',
            total: 'latency: *',
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
        version: 2,
      });

      const rollUpTransformResponse = await supertestAPI
        .get(`/internal/transform/transforms/slo-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect roll up transform to be created
      expect(rollUpTransformResponse.body).eql({
        count: 1,
        transforms: [
          {
            id: `slo-${id}-1`,
            authorization: { roles: ['superuser'] },
            version: '10.0.0',
            create_time: rollUpTransformResponse.body.transforms[0].create_time,
            source: {
              index: ['service-logs*'],
              query: {
                bool: {
                  filter: [
                    { range: { '@timestamp': { gte: 'now-30d/d' } } },
                    {
                      bool: { should: [{ exists: { field: 'dataset' } }], minimum_should_match: 1 },
                    },
                  ],
                },
              },
              runtime_mappings: {
                'slo.id': {
                  type: 'keyword',
                  script: { source: `emit('${id}')` },
                },
                'slo.revision': { type: 'long', script: { source: 'emit(1)' } },
              },
            },
            dest: {
              index: '.slo-observability.sli-v3',
              pipeline: '.slo-observability.sli.pipeline-v3',
            },
            frequency: '1m',
            sync: { time: { field: '@timestamp', delay: '1m' } },
            pivot: {
              group_by: {
                'slo.id': { terms: { field: 'slo.id' } },
                'slo.revision': { terms: { field: 'slo.revision' } },
                'slo.instanceId': { terms: { field: 'host' } },
                'slo.groupings.host': { terms: { field: 'host' } },
                '@timestamp': { date_histogram: { field: '@timestamp', fixed_interval: '1m' } },
              },
              aggregations: {
                'slo.numerator': {
                  filter: {
                    bool: {
                      should: [{ range: { latency: { lt: '90' } } }],
                      minimum_should_match: 1,
                    },
                  },
                },
                'slo.denominator': {
                  filter: {
                    bool: { should: [{ exists: { field: 'latency' } }], minimum_should_match: 1 },
                  },
                },
              },
            },
            description: `Rolled-up SLI data for SLO: Test SLO for api integration [id: ${id}, revision: 1]`,
            settings: { deduce_mappings: false, unattended: true },
            _meta: { version: 3, managed: true, managed_by: 'observability' },
          },
        ],
      });

      const summaryTransform = await supertestAPI
        .get(`/internal/transform/transforms/slo-summary-${id}-1`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '1')
        .send()
        .expect(200);

      // expect summary transform to be created
      expect(summaryTransform.body).eql({
        count: 1,
        transforms: [
          {
            id: `slo-summary-${id}-1`,
            authorization: { roles: ['superuser'] },
            version: '10.0.0',
            create_time: summaryTransform.body.transforms[0].create_time,
            source: {
              index: ['.slo-observability.sli-v3*'],
              query: {
                bool: {
                  filter: [
                    { range: { '@timestamp': { gte: 'now-30d/m', lte: 'now/m' } } },
                    { term: { 'slo.id': id } },
                    { term: { 'slo.revision': 1 } },
                  ],
                },
              },
            },
            dest: {
              index: '.slo-observability.summary-v3',
              pipeline: `.slo-observability.summary.pipeline-${id}-1`,
            },
            frequency: '1m',
            sync: { time: { field: 'event.ingested', delay: '65s' } },
            pivot: {
              group_by: {
                'slo.id': { terms: { field: 'slo.id' } },
                'slo.revision': { terms: { field: 'slo.revision' } },
                'slo.instanceId': { terms: { field: 'slo.instanceId' } },
                'slo.groupings.host': { terms: { field: 'slo.groupings.host' } },
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
                    buckets_path: { errorBudgetConsummed: 'errorBudgetConsumed' },
                    script: '1 - params.errorBudgetConsummed',
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
            description: `Summarise the rollup data of the SLO [id: ${id}, revision: 1].`,
            settings: { deduce_mappings: false, unattended: true },
            _meta: { version: 3, managed: true, managed_by: 'observability' },
          },
        ],
      });
    });
  });
}
