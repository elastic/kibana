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
import { sumBy } from 'lodash';
import { FtrProviderContext } from '../../common/ftr_provider_context';

type MobileStats = APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/stats'>;

// we generate 3 transactions per each mobile device
// timerange 15min, interval 5m, rate 1
// generate 3 http spans for galaxy10 device

async function generateData({
  start,
  end,
  synthtraceEsClient,
}: {
  start: number;
  end: number;
  synthtraceEsClient: ApmSynthtraceEsClient;
}) {
  const galaxy10 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: '1.2' })
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

  return await synthtraceEsClient.index([
    timerange(start, end)
      .interval('5m')
      .rate(1)
      .generator((timestamp) => {
        galaxy10.startNewSession();
        huaweiP2.startNewSession();
        return [
          galaxy10
            .transaction('Start View - View Appearing', 'Android Activity')
            .errors(galaxy10.crash({ message: 'error' }).timestamp(timestamp))
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
            .errors(
              huaweiP2.crash({ message: 'error' }).timestamp(timestamp),
              huaweiP2.crash({ message: 'error' }).timestamp(timestamp)
            )
            .timestamp(timestamp)
            .duration(20)
            .success(),
        ];
      }),
  ]);
}

export default function ApiTest({ getService }: FtrProviderContext) {
  const apmApiClient = getService('apmApiClient');
  const registry = getService('registry');
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileStats({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    transactionType = 'mobile',
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    transactionType?: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/stats',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            transactionType,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when('Mobile stats when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileStats({ serviceName: 'foo' });
        expect(response.currentPeriod.sessions.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.requests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
      });
    });
  });

  registry.when('Mobile stats', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      let response: MobileStats;

      before(async () => {
        response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
        });
      });

      it('returns same sessions', () => {
        const { value, timeseries } = response.currentPeriod.sessions;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });

      it('returns same requests', () => {
        const { value, timeseries } = response.currentPeriod.requests;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });

      it('returns same requests', () => {
        const { value, timeseries } = response.currentPeriod.crashes;
        const timeseriesTotal = sumBy(timeseries, 'y');
        expect(value).to.be(timeseriesTotal);
      });
    });

    describe('when filters are applied', () => {
      it('returns empty state for filters', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `app.version:"none"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(0);
        expect(response.currentPeriod.requests.value).to.eql(0);
        expect(response.currentPeriod.crashes.value).to.eql(0);

        expect(response.currentPeriod.sessions.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.requests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.requests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
      });

      it('returns the correct values when single filter is applied', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          environment: 'production',
          kuery: `service.version:"2.3"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(3);
        expect(response.currentPeriod.requests.value).to.eql(0);
        expect(response.currentPeriod.crashes.value).to.eql(1);
      });

      it('returns the correct values when multiple filters are applied', async () => {
        const response = await getMobileStats({
          serviceName: 'synth-android',
          kuery: `service.version:"1.2" and service.environment: "production"`,
        });

        expect(response.currentPeriod.sessions.value).to.eql(3);
        expect(response.currentPeriod.requests.value).to.eql(3);
        expect(response.currentPeriod.crashes.value).to.eql(2);
      });
    });
  });
}
