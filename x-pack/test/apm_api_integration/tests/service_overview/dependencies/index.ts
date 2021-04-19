/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { last, pick, sortBy } from 'lodash';
import { ValuesType } from 'utility-types';
import moment from 'moment';
import { createApmApiSupertest } from '../../../common/apm_api_supertest';
import { roundNumber } from '../../../utils';
import { ENVIRONMENT_ALL } from '../../../../../plugins/apm/common/environment_filter_values';
import { APIReturnType } from '../../../../../plugins/apm/public/services/rest/createCallApmApi';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { registry } from '../../../common/registry';
import { apmDependenciesMapping, createServiceDependencyDocs } from './es_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiSupertest = createApmApiSupertest(getService('supertest'));
  const es = getService('es');

  const archiveName = 'apm_8.0.0';
  const timeRange = archives[archiveName];
  const comparisonStart = timeRange.start;
  const comparisonEnd = moment(timeRange.start).add(15, 'minutes').toISOString();

  const start = moment(timeRange.end).subtract(15, 'minutes').toISOString();
  const end = timeRange.end;

  registry.when(
    'Service overview dependencies when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiSupertest({
          endpoint: `GET /api/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
              comparisonStart,
              comparisonEnd,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body).to.eql({ serviceDependencies: [] });
      });
    }
  );

  registry.when(
    'Service overview dependencies when specific data is loaded',
    { config: 'basic', archives: [] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;
      };

      const indices = {
        metric: 'apm-dependencies-metric',
        transaction: 'apm-dependencies-transaction',
        span: 'apm-dependencies-span',
      };

      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();

      after(async () => {
        const allIndices = Object.values(indices).join(',');
        const indexExists = (await es.indices.exists({ index: allIndices })).body;
        if (indexExists) {
          await es.indices.delete({
            index: allIndices,
          });
        }
      });

      before(async () => {
        await es.indices.create({
          index: indices.metric,
          body: {
            mappings: apmDependenciesMapping,
          },
        });

        await es.indices.create({
          index: indices.transaction,
          body: {
            mappings: apmDependenciesMapping,
          },
        });

        await es.indices.create({
          index: indices.span,
          body: {
            mappings: apmDependenciesMapping,
          },
        });

        const docs = [
          ...createServiceDependencyDocs({
            service: {
              name: 'opbeans-java',
              environment: 'production',
            },
            agentName: 'java',
            span: {
              type: 'external',
              subtype: 'http',
            },
            resource: 'opbeans-node:3000',
            outcome: 'success',
            responseTime: {
              count: 2,
              sum: 10,
            },
            time: startTime,
            to: {
              service: {
                name: 'opbeans-node',
              },
              agentName: 'nodejs',
            },
          }),
          ...createServiceDependencyDocs({
            service: {
              name: 'opbeans-java',
              environment: 'production',
            },
            agentName: 'java',
            span: {
              type: 'external',
              subtype: 'http',
            },
            resource: 'opbeans-node:3000',
            outcome: 'failure',
            responseTime: {
              count: 1,
              sum: 10,
            },
            time: startTime,
          }),
          ...createServiceDependencyDocs({
            service: {
              name: 'opbeans-java',
              environment: 'production',
            },
            agentName: 'java',
            span: {
              type: 'external',
              subtype: 'http',
            },
            resource: 'postgres',
            outcome: 'success',
            responseTime: {
              count: 1,
              sum: 3,
            },
            time: startTime,
          }),
          ...createServiceDependencyDocs({
            service: {
              name: 'opbeans-java',
              environment: 'production',
            },
            agentName: 'java',
            span: {
              type: 'external',
              subtype: 'http',
            },
            resource: 'opbeans-node-via-proxy',
            outcome: 'success',
            responseTime: {
              count: 1,
              sum: 1,
            },
            time: endTime - 1,
            to: {
              service: {
                name: 'opbeans-node',
              },
              agentName: 'nodejs',
            },
          }),
        ];

        const bulkActions = docs.reduce(
          (prev, doc) => {
            return [...prev, { index: { _index: indices[doc.processor.event] } }, doc];
          },
          [] as Array<
            | {
                index: {
                  _index: string;
                };
              }
            | ValuesType<typeof docs>
          >
        );

        await es.bulk({
          body: bulkActions,
          refresh: 'wait_for',
        });

        response = await apmApiSupertest({
          endpoint: `GET /api/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
              comparisonStart,
              comparisonEnd,
            },
          },
        });
      });

      it('returns a 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns correct number of dependencies', () => {
        expect(response.body.serviceDependencies.length).to.be(2);
      });

      it('returns opbeans-node as a dependency', () => {
        const opbeansNode = response.body.serviceDependencies.find(
          (item) => item.type === 'service' && item.serviceName === 'opbeans-node'
        );

        expect(opbeansNode !== undefined).to.be(true);

        expectSnapshot(opbeansNode).toMatch();

        const currentPeriodFirstValue = roundNumber(
          opbeansNode?.currentPeriodMetrics.latency.timeseries[0].y
        );
        const currentPeriodLastValue = roundNumber(
          last(opbeansNode?.previousPeriodMetrics?.latency?.timeseries)?.y
        );

        expectSnapshot(currentPeriodFirstValue).toMatchInline(`"6.667"`);
        expectSnapshot(currentPeriodLastValue).toMatchInline(`"6.667"`);
      });

      it('returns postgres as an external dependency', () => {
        const postgres = response.body.serviceDependencies.find(
          (item) => item.type === 'external' && item.name === 'postgres'
        );

        expect(postgres !== undefined).to.be(true);

        const fields = ['spanType', 'spanSubtype', 'name', 'type'];
        const currentValues = {
          latency: roundNumber(postgres?.currentPeriodMetrics.latency.value),
          throughput: roundNumber(postgres?.currentPeriodMetrics.throughput.value),
          errorRate: roundNumber(postgres?.currentPeriodMetrics.errorRate.value),
          impact: postgres?.currentPeriodMetrics.impact,
          ...pick(postgres, ...fields),
        };

        expectSnapshot(currentValues).toMatchInline(`
          Object {
            "errorRate": "0.000",
            "impact": 0,
            "latency": "3.000",
            "name": "postgres",
            "spanSubtype": "http",
            "spanType": "external",
            "throughput": "0.06667",
            "type": "external",
          }
        `);

        const previousValues = {
          latency: roundNumber(postgres?.previousPeriodMetrics.latency?.value),
          throughput: roundNumber(postgres?.previousPeriodMetrics.throughput?.value),
          errorRate: roundNumber(postgres?.previousPeriodMetrics.errorRate?.value),
          impact: postgres?.previousPeriodMetrics?.impact,
          ...pick(postgres, ...fields),
        };

        expectSnapshot(previousValues).toMatchInline(`
          Object {
            "errorRate": "0.000",
            "impact": 0,
            "latency": "3.000",
            "name": "postgres",
            "spanSubtype": "http",
            "spanType": "external",
            "throughput": "0.06667",
            "type": "external",
          }
        `);
      });
    }
  );

  registry.when(
    'Service overview dependencies when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /api/apm/services/{serviceName}/dependencies'>;
      };

      before(async () => {
        response = await apmApiSupertest({
          endpoint: `GET /api/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-python' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
              comparisonStart,
              comparisonEnd,
            },
          },
        });
      });

      it('returns a successful response', () => {
        expect(response.status).to.be(200);
      });

      it('returns at least one item', () => {
        expect(response.body.serviceDependencies.length).to.be.greaterThan(0);
        expectSnapshot(response.body.serviceDependencies[0]).toMatch();
      });

      it('returns the right names', () => {
        const names = response.body.serviceDependencies.map((item) => item.name);
        expectSnapshot(names.sort()).toMatchInline(`
          Array [
            "elasticsearch",
            "opbeans-java",
            "postgresql",
            "redis",
          ]
        `);
      });

      it('returns the right service names', () => {
        const serviceNames = response.body.serviceDependencies
          .map((item) => (item.type === 'service' ? item.serviceName : undefined))
          .filter(Boolean);

        expectSnapshot(serviceNames.sort()).toMatchInline(`
          Array [
            "opbeans-java",
          ]
        `);
      });

      it('returns the right latency values', () => {
        const latencyValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: item.name,
            currentPeriodLatency: item.currentPeriodMetrics.latency.value,
            previousPeriodLatency: item.previousPeriodMetrics?.latency?.value,
          })),
          'name'
        );

        expectSnapshot(latencyValues).toMatchInline(`
          Array [
            Object {
              "currentPeriodLatency": 2628.905,
              "name": "elasticsearch",
              "previousPeriodLatency": 2505.390625,
            },
            Object {
              "currentPeriodLatency": 27859.2857142857,
              "name": "opbeans-java",
              "previousPeriodLatency": 23831.8888888889,
            },
            Object {
              "currentPeriodLatency": 28580.1312997347,
              "name": "postgresql",
              "previousPeriodLatency": 29184.1857142857,
            },
            Object {
              "currentPeriodLatency": 1135.15508885299,
              "name": "redis",
              "previousPeriodLatency": 949.938333333333,
            },
          ]
        `);
      });

      it('returns the right throughput values', () => {
        const throughputValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: item.name,
            currentPeriodThroughput: item.currentPeriodMetrics.throughput.value,
            previousPeriodThroughput: item.previousPeriodMetrics?.throughput?.value,
          })),
          'name'
        );

        expectSnapshot(throughputValues).toMatchInline(`
          Array [
            Object {
              "currentPeriodThroughput": 13.3333333333333,
              "name": "elasticsearch",
              "previousPeriodThroughput": 12.8,
            },
            Object {
              "currentPeriodThroughput": 0.466666666666667,
              "name": "opbeans-java",
              "previousPeriodThroughput": 0.6,
            },
            Object {
              "currentPeriodThroughput": 50.2666666666667,
              "name": "postgresql",
              "previousPeriodThroughput": 51.3333333333333,
            },
            Object {
              "currentPeriodThroughput": 41.2666666666667,
              "name": "redis",
              "previousPeriodThroughput": 40,
            },
          ]
        `);
      });

      it('returns the right impact values', () => {
        const impactValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: item.name,
            currentPeriodImpact: item.currentPeriodMetrics.impact,
            previousPeriodImpact: item.previousPeriodMetrics?.impact,
          })),
          'name'
        );

        expectSnapshot(impactValues).toMatchInline(`
          Array [
            Object {
              "currentPeriodImpact": 1.54893576051104,
              "name": "elasticsearch",
              "previousPeriodImpact": 1.19757368986118,
            },
            Object {
              "currentPeriodImpact": 0,
              "name": "opbeans-java",
              "previousPeriodImpact": 0,
            },
            Object {
              "currentPeriodImpact": 100,
              "name": "postgresql",
              "previousPeriodImpact": 100,
            },
            Object {
              "currentPeriodImpact": 2.37724265214801,
              "name": "redis",
              "previousPeriodImpact": 1.59711836133489,
            },
          ]
        `);
      });
    }
  );
}
