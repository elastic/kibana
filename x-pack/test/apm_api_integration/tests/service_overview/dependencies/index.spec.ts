/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { last, omit, pick, sortBy } from 'lodash';
import { ValuesType } from 'utility-types';
import { Node, NodeType } from '../../../../../plugins/apm/common/connections';
import { roundNumber } from '../../../utils';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../plugins/apm/common/environment_filter_values';
import { APIReturnType } from '../../../../../plugins/apm/public/services/rest/create_call_apm_api';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../../common/ftr_provider_context';
import { apmDependenciesMapping, createServiceDependencyDocs } from './es_utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');
  const es = getService('es');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  function getName(node: Node) {
    return node.type === NodeType.service ? node.serviceName : node.backendName;
  }

  registry.when(
    'Service overview dependencies when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      it('handles the empty state', async () => {
        const response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          },
        });

        expect(response.status).to.be(200);
        expect(response.body.serviceDependencies).to.eql([]);
      });
    }
  );

  registry.when(
    'Service overview dependencies when specific data is loaded',
    { config: 'basic', archives: [] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /internal/apm/services/{serviceName}/dependencies'>;
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
        const indexExists = await es.indices.exists({ index: allIndices });
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

        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-java' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          },
        });
      });

      it('returns a 200', () => {
        expect(response.status).to.be(200);
      });

      it('returns two dependencies', () => {
        expect(response.body.serviceDependencies.length).to.be(2);
      });

      it('returns opbeans-node as a dependency', () => {
        const opbeansNode = response.body.serviceDependencies.find(
          (item) => getName(item.location) === 'opbeans-node'
        );

        expect(opbeansNode !== undefined).to.be(true);

        const values = {
          latency: roundNumber(opbeansNode?.currentStats.latency.value),
          throughput: roundNumber(opbeansNode?.currentStats.throughput.value),
          errorRate: roundNumber(opbeansNode?.currentStats.errorRate.value),
          impact: opbeansNode?.currentStats.impact,
          ...pick(opbeansNode?.location, 'serviceName', 'type', 'agentName', 'environment'),
        };

        const count = 4;
        const sum = 21;
        const errors = 1;

        expect(values).to.eql({
          agentName: 'nodejs',
          environment: ENVIRONMENT_NOT_DEFINED.value,
          serviceName: 'opbeans-node',
          type: 'service',
          errorRate: roundNumber(errors / count),
          latency: roundNumber(sum / count),
          throughput: roundNumber(count / ((endTime - startTime) / 1000 / 60)),
          impact: 100,
        });

        const firstValue = roundNumber(opbeansNode?.currentStats.latency.timeseries[0].y);
        const lastValue = roundNumber(last(opbeansNode?.currentStats.latency.timeseries)?.y);

        expect(firstValue).to.be(roundNumber(20 / 3));
        expect(lastValue).to.be('1.000');
      });

      it('returns postgres as an external dependency', () => {
        const postgres = response.body.serviceDependencies.find(
          (item) => getName(item.location) === 'postgres'
        );

        expect(postgres !== undefined).to.be(true);

        const values = {
          latency: roundNumber(postgres?.currentStats.latency.value),
          throughput: roundNumber(postgres?.currentStats.throughput.value),
          errorRate: roundNumber(postgres?.currentStats.errorRate.value),
          impact: postgres?.currentStats.impact,
          ...pick(postgres?.location, 'spanType', 'spanSubtype', 'backendName', 'type'),
        };

        const count = 1;
        const sum = 3;
        const errors = 0;

        expect(values).to.eql({
          spanType: 'external',
          spanSubtype: 'http',
          backendName: 'postgres',
          type: 'backend',
          errorRate: roundNumber(errors / count),
          latency: roundNumber(sum / count),
          throughput: roundNumber(count / ((endTime - startTime) / 1000 / 60)),
          impact: 0,
        });
      });
    }
  );

  registry.when(
    'Service overview dependencies when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      let response: {
        status: number;
        body: APIReturnType<'GET /internal/apm/services/{serviceName}/dependencies'>;
      };

      before(async () => {
        response = await apmApiClient.readUser({
          endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
          params: {
            path: { serviceName: 'opbeans-python' },
            query: {
              start,
              end,
              numBuckets: 20,
              environment: ENVIRONMENT_ALL.value,
            },
          },
        });
      });

      it('returns a successful response', () => {
        expect(response.status).to.be(200);
      });

      it('returns at least one item', () => {
        expect(response.body.serviceDependencies.length).to.be.greaterThan(0);

        expectSnapshot(response.body.serviceDependencies.length).toMatchInline(`4`);

        const { currentStats, ...firstItem } = sortBy(
          response.body.serviceDependencies,
          'currentStats.impact'
        ).reverse()[0];

        expectSnapshot(firstItem.location).toMatchInline(`
          Object {
            "agentName": "dotnet",
            "environment": "production",
            "id": "5948c153c2d8989f92a9c75ef45bb845f53e200d",
            "serviceName": "opbeans-dotnet",
            "type": "service",
          }
        `);

        expectSnapshot(
          omit(currentStats, [
            'errorRate.timeseries',
            'throughput.timeseries',
            'latency.timeseries',
            'totalTime.timeseries',
          ])
        ).toMatchInline(`
          Object {
            "errorRate": Object {
              "value": 0.163636363636364,
            },
            "impact": 100,
            "latency": Object {
              "value": 1117085.74545455,
            },
            "throughput": Object {
              "value": 1.83333333333333,
            },
            "totalTime": Object {
              "value": 61439716,
            },
          }
        `);
      });

      it('returns the right names', () => {
        const names = response.body.serviceDependencies.map((item) => getName(item.location));
        expectSnapshot(names.sort()).toMatchInline(`
          Array [
            "elasticsearch",
            "opbeans-dotnet",
            "postgresql",
            "redis",
          ]
        `);
      });

      it('returns the right service names', () => {
        const serviceNames = response.body.serviceDependencies
          .map((item) =>
            item.location.type === NodeType.service ? getName(item.location) : undefined
          )
          .filter(Boolean);

        expectSnapshot(serviceNames.sort()).toMatchInline(`
          Array [
            "opbeans-dotnet",
          ]
        `);
      });

      it('returns the right latency values', () => {
        const latencyValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: getName(item.location),
            latency: item.currentStats.latency.value,
          })),
          'name'
        );

        expectSnapshot(latencyValues).toMatchInline(`
          Array [
            Object {
              "latency": 9496.32291666667,
              "name": "elasticsearch",
            },
            Object {
              "latency": 1117085.74545455,
              "name": "opbeans-dotnet",
            },
            Object {
              "latency": 27826.9968314322,
              "name": "postgresql",
            },
            Object {
              "latency": 1468.27242524917,
              "name": "redis",
            },
          ]
        `);
      });

      it('returns the right throughput values', () => {
        const throughputValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: getName(item.location),
            throughput: item.currentStats.throughput.value,
          })),
          'name'
        );

        expectSnapshot(throughputValues).toMatchInline(`
          Array [
            Object {
              "name": "elasticsearch",
              "throughput": 3.2,
            },
            Object {
              "name": "opbeans-dotnet",
              "throughput": 1.83333333333333,
            },
            Object {
              "name": "postgresql",
              "throughput": 52.6,
            },
            Object {
              "name": "redis",
              "throughput": 40.1333333333333,
            },
          ]
        `);
      });

      it('returns the right impact values', () => {
        const impactValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: getName(item.location),
            impact: item.currentStats.impact,
          })),
          'name'
        );

        expectSnapshot(impactValues).toMatchInline(`
          Array [
            Object {
              "impact": 0,
              "name": "elasticsearch",
            },
            Object {
              "impact": 100,
              "name": "opbeans-dotnet",
            },
            Object {
              "impact": 71.0403531954737,
              "name": "postgresql",
            },
            Object {
              "impact": 1.41447268043525,
              "name": "redis",
            },
          ]
        `);
      });

      it('returns the right totalTime values', () => {
        const totalTimeValues = sortBy(
          response.body.serviceDependencies.map((item) => ({
            name: getName(item.location),
            totalTime: item.currentStats.totalTime.value,
          })),
          'name'
        );

        expectSnapshot(totalTimeValues).toMatchInline(`
          Array [
            Object {
              "name": "elasticsearch",
              "totalTime": 911647,
            },
            Object {
              "name": "opbeans-dotnet",
              "totalTime": 61439716,
            },
            Object {
              "name": "postgresql",
              "totalTime": 43911001,
            },
            Object {
              "name": "redis",
              "totalTime": 1767800,
            },
          ]
        `);
      });
    }
  );
}
