/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import type { ApmSynthtraceEsClient } from '@kbn/synthtrace';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { MobileProperty } from '@kbn/apm-types';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

type MobileFilters = APIReturnType<'GET /internal/apm/services/{serviceName}/mobile/filters'>;

async function generateData({
  start,
  end,
  apmSynthtraceEsClient,
}: {
  start: number;
  end: number;
  apmSynthtraceEsClient: ApmSynthtraceEsClient;
}) {
  const galaxy10 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: '1.1' })
    .deviceInfo({
      manufacturer: 'Samsung',
      modelIdentifier: 'SM-G973F',
      modelName: 'Galaxy S10',
    })
    .osInfo({
      osType: 'android',
      osVersion: '10',
      osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setGeoInfo({
      clientIp: '223.72.43.22',
      cityName: 'Beijing',
      continentName: 'Asia',
      countryIsoCode: 'CN',
      countryName: 'China',
      regionIsoCode: 'CN-BJ',
      regionName: 'Beijing',
      location: { coordinates: [116.3861, 39.9143], type: 'Point' },
    })
    .setNetworkConnection({ type: 'wifi' });

  const huaweiP2 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: '2.3' })
    .deviceInfo({
      manufacturer: 'Huawei',
      modelIdentifier: 'HUAWEI P2-0000',
      modelName: 'HuaweiP2',
    })
    .osInfo({
      osType: 'android',
      osVersion: '11',
      osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setGeoInfo({
      clientIp: '20.24.184.101',
      cityName: 'Singapore',
      continentName: 'Asia',
      countryIsoCode: 'SG',
      countryName: 'Singapore',
      location: { coordinates: [103.8554, 1.3036], type: 'Point' },
    })
    .setNetworkConnection({
      type: 'cell',
      subType: 'edge',
      carrierName: 'Osaka Gas Business Create Co., Ltd.',
      carrierMNC: '17',
      carrierICC: 'JP',
      carrierMCC: '440',
    });

  return await apmSynthtraceEsClient.index([
    timerange(start, end)
      .interval('5m')
      .rate(1)
      .generator((timestamp) => {
        galaxy10.startNewSession();
        huaweiP2.startNewSession();
        return [
          galaxy10
            .transaction('Start View - View Appearing', 'Android Activity')
            .timestamp(timestamp)
            .duration(500)
            .success()
            // Only galaxy10 crashes, so the crash-scoped filters are a strict
            // subset of the transaction-scoped ones.
            .errors(galaxy10.crash({ message: 'crash 1' }).timestamp(timestamp))
            .children(
              galaxy10
                .httpSpan({
                  spanName: 'GET backend:1234',
                  httpMethod: 'GET',
                  httpUrl: 'https://backend:1234/api/start',
                })
                .duration(800)
                .success()
                .timestamp(timestamp + 400)
            ),
          huaweiP2
            .transaction('Start View - View Appearing', 'huaweiP2 Activity')
            .timestamp(timestamp)
            .duration(20)
            .success()
            .children(
              huaweiP2
                .httpSpan({
                  spanName: 'GET backend:1234',
                  httpMethod: 'GET',
                  httpUrl: 'https://backend:1234/api/start',
                })
                .duration(800)
                .success()
                .timestamp(timestamp + 400)
            ),
        ];
      }),
  ]);
}

export default function ApiTest({ getService }: DeploymentAgnosticFtrProviderContext) {
  const apmApiClient = getService('apmApi');

  const synthtrace = getService('synthtrace');
  let apmSynthtraceEsClient: ApmSynthtraceEsClient;

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileFilters({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    errorType,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    errorType?: 'crash';
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/services/{serviceName}/mobile/filters',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            // Omitted entirely when unset: an explicit `undefined` is
            // serialized as the literal string "undefined" and fails validation.
            ...(errorType ? { errorType } : {}),
          },
        },
      })
      .then(({ body }) => body);
  }

  // Looks the filter up explicitly so a missing key fails loudly instead of
  // silently skipping the assertion.
  function getOptions(response: MobileFilters, key: MobileFilters['mobileFilters'][0]['key']) {
    const filter = response.mobileFilters.find((mobileFilter) => mobileFilter.key === key);
    if (!filter) {
      throw new Error(`Expected a "${key}" filter in the response`);
    }
    return [...filter.options].sort();
  }

  describe('Mobile filters', () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileFilters({ serviceName: 'foo' });
        response.mobileFilters.map(({ key, options }) => {
          expect(options).to.eql([]);
        });
      });
    });

    describe('when data is loaded', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateData({
          apmSynthtraceEsClient,
          start,
          end,
        });
        response = await getMobileFilters({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      after(() => apmSynthtraceEsClient.clean());
      let response: MobileFilters;

      it('returns correct filters for device', () => {
        response.mobileFilters.map(({ key, options }) => {
          if (key === 'device') {
            expect(options).to.eql(['HUAWEI P2-0000', 'SM-G973F']);
          }
        });
      });

      it('returns correct filters for app version', () => {
        response.mobileFilters.map(({ key, options }) => {
          if (key === 'appVersion') {
            expect(options).to.eql(['1.1', '2.3']);
          }
        });
      });

      it('returns correct filters for os version', () => {
        response.mobileFilters.map(({ key, options }) => {
          if (key === 'osVersion') {
            expect(options).to.eql(['10', '11']);
          }
        });
      });

      it('returns correct filters for network connection type', () => {
        response.mobileFilters.map(({ key, options }) => {
          if (key === 'netConnectionType') {
            expect(options).to.eql(['cell', 'wifi']);
          }
        });
      });
    });

    describe('when scoped to crashes', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateData({
          apmSynthtraceEsClient,
          start,
          end,
        });
        response = await getMobileFilters({
          serviceName: 'synth-android',
          environment: 'production',
          errorType: 'crash',
        });
      });

      after(() => apmSynthtraceEsClient.clean());
      let response: MobileFilters;

      it('only returns the device that crashed', () => {
        // huaweiP2 ('HUAWEI P2-0000') has transactions but no crashes.
        expect(getOptions(response, MobileProperty.Device)).to.eql(['SM-G973F']);
      });

      it('only returns the app version that crashed', () => {
        // huaweiP2 runs '2.3'.
        expect(getOptions(response, MobileProperty.AppVersion)).to.eql(['1.1']);
      });

      it('only returns the os version that crashed', () => {
        // huaweiP2 runs os version '11'.
        expect(getOptions(response, MobileProperty.OsVersion)).to.eql(['10']);
      });

      it('returns no network connection types', () => {
        // Empty rather than ['wifi'] because synthtrace writes
        // `network.connection.*` onto http spans only, never onto error
        // documents. Asserted regardless: if the aggregation regressed to
        // querying spans, span-derived values would show up here.
        expect(getOptions(response, MobileProperty.NetworkConnectionType)).to.eql([]);
      });
    });
  });
}
