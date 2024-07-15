/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { isEmpty } from 'lodash';
import moment from 'moment';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { generateMobileData, SERVICE_VERSIONS } from './generate_mobile_data';

type MobileDetailedStatisticsResponse =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics'>;

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileDetailedStatisticsByField({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    field,
    offset,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    field: string;
    offset?: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/detailed_statistics',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: moment(end).subtract(7, 'minutes').toISOString(),
            end: new Date(end).toISOString(),
            offset,
            kuery,
            field,
            fieldValues: JSON.stringify(SERVICE_VERSIONS),
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when(
    'Mobile detailed statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when no data', () => {
        it('handles empty state', async () => {
          const response = await getMobileDetailedStatisticsByField({
            serviceName: 'foo',
            field: 'service.version',
          });
          expect(response).to.be.eql({ currentPeriod: {}, previousPeriod: {} });
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177388
  registry.when.skip(
    'Mobile detailed statistics when data is loaded',
    { config: 'basic', archives: [] },
    () => {
      before(async () => {
        await generateMobileData({
          apmSynthtraceEsClient,
          start,
          end,
        });
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('when comparison is disable', () => {
        it('returns current period data only', async () => {
          const response = await getMobileDetailedStatisticsByField({
            serviceName: 'synth-android',
            environment: 'production',
            field: 'service.version',
          });

          expect(Object.keys(response.currentPeriod)).to.be.eql(['2.3', '1.1', '1.2']);
          expect(isEmpty(response.previousPeriod)).to.be.equal(true);
        });
      });

      describe('when comparison is enable', () => {
        let mobiledetailedStatisticResponse: MobileDetailedStatisticsResponse;

        before(async () => {
          mobiledetailedStatisticResponse = await getMobileDetailedStatisticsByField({
            serviceName: 'synth-android',
            environment: 'production',
            field: 'service.version',
            offset: '8m',
          });
        });
        it('returns some data for both periods', async () => {
          expect(Object.keys(mobiledetailedStatisticResponse.currentPeriod).sort()).to.be.eql(
            SERVICE_VERSIONS.sort()
          );
          expect(Object.keys(mobiledetailedStatisticResponse.previousPeriod).sort()).to.be.eql(
            SERVICE_VERSIONS.sort()
          );
        });

        it('returns same number of buckets for both periods', () => {
          const currentPeriod = mobiledetailedStatisticResponse.currentPeriod[SERVICE_VERSIONS[0]];
          const previousPeriod =
            mobiledetailedStatisticResponse.previousPeriod[SERVICE_VERSIONS[0]];

          [
            [currentPeriod.latency, previousPeriod.latency],
            [currentPeriod.throughput, previousPeriod.throughput],
          ].forEach(([currentTimeseries, previousTimeseries]) => {
            expect(currentTimeseries.length).to.equal(previousTimeseries.length);
          });
        });
      });
    }
  );
}
