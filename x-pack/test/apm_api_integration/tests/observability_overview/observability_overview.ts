/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { meanBy } from 'lodash';
import archives_metadata from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { registry } from '../../common/registry';
import { PromiseReturnType } from '../../../../plugins/observability/typings/common';
import { roundNumber } from '../../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_synthetic_8.0.0';
  const metadata = archives_metadata[archiveName];

  // url parameters
  const start = metadata.start;
  const end = metadata.end;
  const intervalString = '60s';
  const bucketSize = 60;

  async function getThroughputValues() {
    const commonQuery = {
      start: metadata.start,
      end: metadata.end,
    };
    const [serviceInventoryAPIResponse, observabilityOverviewAPIResponse] = await Promise.all([
      apmApiClient.readUser({
        endpoint: 'GET /api/apm/services',
        params: {
          query: {
            ...commonQuery,
            environment: 'ENVIRONMENT_ALL',
            kuery: '',
          },
        },
      }),
      apmApiClient.readUser({
        endpoint: `GET /api/apm/observability_overview`,
        params: {
          query: {
            ...commonQuery,
            bucketSize,
            intervalString,
          },
        },
      }),
    ]);
    const serviceInventoryThroughputMean = roundNumber(
      meanBy(serviceInventoryAPIResponse.body.items, 'throughput')
    );

    return {
      serviceInventoryCount: serviceInventoryAPIResponse.body.items.length,
      serviceInventoryThroughputMean,
      observabilityOverview: observabilityOverviewAPIResponse.body,
    };
  }

  registry.when(
    'Observability overview when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when data is not loaded', () => {
        it('handles the empty state', async () => {
          const response = await apmApiClient.readUser({
            endpoint: `GET /api/apm/observability_overview`,
            params: {
              query: {
                start,
                end,
                bucketSize,
                intervalString,
              },
            },
          });
          expect(response.status).to.be(200);

          expect(response.body.serviceCount).to.be(0);
          expect(response.body.transactionPerMinute.timeseries.length).to.be(0);
        });
      });
    }
  );

  let throughputValues: PromiseReturnType<typeof getThroughputValues>;

  registry.when(
    'Observability overview when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      before(async () => {
        throughputValues = await getThroughputValues();
      });

      it('returns same number of service as shown on service inventory API', () => {
        const { serviceInventoryCount, observabilityOverview } = throughputValues;
        expect(serviceInventoryCount).to.equal(observabilityOverview.serviceCount);
      });

      it('returns same throughput value on service inventory and obs throughput count', () => {
        const { serviceInventoryThroughputMean, observabilityOverview } = throughputValues;
        const obsThroughputCount = roundNumber(observabilityOverview.transactionPerMinute.value);
        expectSnapshot(serviceInventoryThroughputMean).toMatchInline(`"100.0"`);
        expectSnapshot(obsThroughputCount).toMatchInline(`"100.0"`);
        expect(serviceInventoryThroughputMean).to.equal(obsThroughputCount);
      });

      it('returns same throughput value on service inventory and obs mean throughput timeseries', () => {
        const { serviceInventoryThroughputMean, observabilityOverview } = throughputValues;
        const obsThroughputMean = roundNumber(
          meanBy(observabilityOverview.transactionPerMinute.timeseries, 'y')
        );
        expectSnapshot(serviceInventoryThroughputMean).toMatchInline(`"100.0"`);
        expectSnapshot(obsThroughputMean).toMatchInline(`"100.0"`);
        expect(serviceInventoryThroughputMean).to.equal(obsThroughputMean);
      });
    }
  );
}
