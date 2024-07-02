/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { FtrProviderContext } from '../../common/ftr_provider_context';

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

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileFilters({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
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
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when('Mobile filters when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileFilters({ serviceName: 'foo' });
        response.mobileFilters.map(({ key, options }) => {
          expect(options).to.eql([]);
        });
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/177389
  registry.when.skip('Mobile filters', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateData({
        apmSynthtraceEsClient,
        start,
        end,
      });
    });

    after(() => apmSynthtraceEsClient.clean());

    describe('when data is loaded', () => {
      let response: MobileFilters;

      before(async () => {
        response = await getMobileFilters({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

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
  });
}
