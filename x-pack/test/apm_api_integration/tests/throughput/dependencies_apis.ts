/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { meanBy } from 'lodash';
import { BackendNode } from '../../../../plugins/apm/common/connections';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_synthetic_8.0.0';
  const metadata = archives_metadata[archiveName];

  async function getThroughputValues({ serviceName }: { serviceName: string }) {
    const commonQuery = {
      start: metadata.start,
      end: metadata.end,
      environment: 'ENVIRONMENT_ALL',
    };
    const [
      serviceDependencyAPIResponse,
      topBackendsAPIResponse,
      backendThroughputChartAPIResponse,
    ] = await Promise.all([
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/services/{serviceName}/dependencies`,
        params: {
          path: { serviceName },
          query: {
            ...commonQuery,
            numBuckets: 20,
            offset: '1d',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/backends/top_backends`,
        params: {
          query: {
            ...commonQuery,
            numBuckets: 20,
            kuery: '',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /internal/apm/backends/{backendName}/charts/throughput`,
        params: {
          path: { backendName: 'elasticsearch' },
          query: {
            ...commonQuery,
            kuery: '',
          },
        },
      }),
    ]);
    const backendThroughputChartMean = meanBy(
      backendThroughputChartAPIResponse.body.currentTimeseries,
      'y'
    );

    return {
      serviceDependencies: serviceDependencyAPIResponse.body.serviceDependencies.map((item) => ({
        backendName: (item.location as BackendNode).backendName,
        throughputValue: item.currentStats.throughput.value,
      })),
      topBackends: topBackendsAPIResponse.body.backends.map((item) => ({
        backendName: (item.location as BackendNode).backendName,
        throughputValue: item.currentStats.throughput.value,
      })),
      backendThroughputChartMean,
    };
  }

  let throughputValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when(
    'Dependencies throughput value',
    { config: 'basic', archives: [archiveName] },
    () => {
      describe('compare throughput value between service dependencies, top backends and backend throughput chart', () => {
        before(async () => {
          throughputValues = await getThroughputValues({
            serviceName: 'opbeans-go',
          });
        });

        it('returns same throughput values on top backends and service dependencies apis', () => {
          const { topBackends, serviceDependencies } = throughputValues;
          expect(topBackends).to.eql(serviceDependencies);
          expectSnapshot(topBackends).toMatchInline(`
            Array [
              Object {
                "backendName": "elasticsearch",
                "throughputValue": 75.0000781250814,
              },
            ]
          `);
          expectSnapshot(serviceDependencies).toMatchInline(`
            Array [
              Object {
                "backendName": "elasticsearch",
                "throughputValue": 75.0000781250814,
              },
            ]
          `);
        });

        it('returns same throughput values on top backends and backends throughput chart apis', () => {
          const { topBackends, backendThroughputChartMean } = throughputValues;
          const elasticsearchDependency = topBackends.find(
            ({ backendName }) => backendName === 'elasticsearch'
          );
          expect(roundNumber(elasticsearchDependency?.throughputValue)).to.equal(
            roundNumber(backendThroughputChartMean)
          );
          expectSnapshot(backendThroughputChartMean).toMatchInline(`75`);
        });
      });
    }
  );
}
