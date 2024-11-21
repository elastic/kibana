/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { omit, sortBy } from 'lodash';
import { type Node, NodeType } from '@kbn/apm-plugin/common/connections';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import archives from '../../../common/fixtures/es_archiver/archives_metadata';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];

  function getName(node: Node) {
    return node.type === NodeType.service ? node.serviceName : node.dependencyName;
  }

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
            "dependencyName": "opbeans:3000",
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
