/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import type { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { APIReturnType } from '@kbn/apm-plugin/public/services/rest/create_call_apm_api';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import type { DeploymentAgnosticFtrProviderContext } from '../../../../ftr_provider_context';

type MobileLocationStats =
  APIReturnType<'GET /internal/apm/mobile-services/{serviceName}/location/stats'>;

// we generate 3 transactions per each mobile device
// timerange 15min, interval 5m, rate 1
// generate 3 http spans for galaxy10 device

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

  const galaxy7 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: '1.2' })
    .deviceInfo({
      manufacturer: 'Samsung',
      modelIdentifier: 'SM-G930F',
      modelName: 'Galaxy S7',
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
    .setNetworkConnection({
      type: 'cell',
      subType: 'edge',
      carrierName: 'M1 Limited',
      carrierMNC: '03',
      carrierICC: 'SG',
      carrierMCC: '525',
    });

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

  await apmSynthtraceEsClient.index([
    timerange(start, end)
      .interval('5m')
      .rate(1)
      .generator((timestamp) => {
        galaxy10.startNewSession();
        galaxy7.startNewSession();
        huaweiP2.startNewSession();
        return [
          galaxy10
            .transaction('Start View - View Appearing', 'Android Activity')
            .errors(galaxy10.crash({ message: 'error' }).timestamp(timestamp))
            .events(galaxy10.event().lifecycle('created').timestamp(timestamp))
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
          galaxy7
            .transaction('Start View - View Appearing', 'Android Activity')
            .errors(galaxy7.crash({ message: 'error' }).timestamp(timestamp))
            .events(galaxy7.event().lifecycle('created').timestamp(timestamp))
            .timestamp(timestamp)
            .duration(20)
            .success(),
          huaweiP2
            .transaction('Start View - View Appearing', 'huaweiP2 Activity')
            .errors(huaweiP2.crash({ message: 'error' }).timestamp(timestamp))
            .events(huaweiP2.event().lifecycle('created').timestamp(timestamp))
            .timestamp(timestamp)
            .duration(20)
            .success(),
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

  async function getMobileLocationStats({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    locationField = 'client.geo.country_name',
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    locationField?: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/location/stats',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            locationField,
          },
        },
      })
      .then(({ body }) => body);
  }

  describe('Location stats', () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileLocationStats({ serviceName: 'foo' });
        expect(response.currentPeriod.mostSessions.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.mostRequests.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.mostCrashes.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
        expect(response.currentPeriod.mostLaunches.timeseries.every((item) => item.y === 0)).to.eql(
          true
        );
      });
    });

    describe('Location stats with data', () => {
      before(async () => {
        apmSynthtraceEsClient = await synthtrace.createApmSynthtraceEsClient();

        await generateData({
          apmSynthtraceEsClient,
          start,
          end,
        });
      });

      after(() => apmSynthtraceEsClient.clean());

      describe('when data is loaded', () => {
        let response: MobileLocationStats;

        before(async () => {
          response = await getMobileLocationStats({
            serviceName: 'synth-android',
            environment: 'production',
          });
        });

        it('returns location for most sessions', () => {
          const { location } = response.currentPeriod.mostSessions;
          expect(location).to.be('China');
        });

        it('returns location for most requests', () => {
          const { location } = response.currentPeriod.mostRequests;
          expect(location).to.be('China');
        });

        it('returns location for most crashes', () => {
          const { location } = response.currentPeriod.mostCrashes;
          expect(location).to.be('China');
        });

        it('returns location for most launches', () => {
          const { location } = response.currentPeriod.mostLaunches;
          expect(location).to.be('China');
        });
      });

      describe('when filters are applied', () => {
        it('returns empty state for filters with no results', async () => {
          const response = await getMobileLocationStats({
            serviceName: 'synth-android',
            environment: 'production',
            kuery: `app.version:"none"`,
          });

          expect(response.currentPeriod.mostSessions.value).to.eql(0);
          expect(response.currentPeriod.mostRequests.value).to.eql(0);
          expect(response.currentPeriod.mostCrashes.value).to.eql(0);
          expect(response.currentPeriod.mostLaunches.value).to.eql(0);

          expect(
            response.currentPeriod.mostSessions.timeseries.every((item) => item.y === 0)
          ).to.eql(true);
          expect(
            response.currentPeriod.mostRequests.timeseries.every((item) => item.y === 0)
          ).to.eql(true);
          expect(
            response.currentPeriod.mostCrashes.timeseries.every((item) => item.y === 0)
          ).to.eql(true);
          expect(
            response.currentPeriod.mostLaunches.timeseries.every((item) => item.y === 0)
          ).to.eql(true);
        });

        it('returns the correct values when single filter is applied', async () => {
          const response = await getMobileLocationStats({
            serviceName: 'synth-android',
            environment: 'production',
            kuery: `service.version:"1.1"`,
          });

          expect(response.currentPeriod.mostSessions.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostCrashes.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostRequests.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostLaunches.timeseries[0].y).to.eql(1);

          expect(response.currentPeriod.mostSessions.value).to.eql(3);
          expect(response.currentPeriod.mostRequests.value).to.eql(3);
          expect(response.currentPeriod.mostCrashes.value).to.eql(3);
          expect(response.currentPeriod.mostLaunches.value).to.eql(3);
        });

        it('returns the correct values when multiple filters are applied', async () => {
          const response = await getMobileLocationStats({
            serviceName: 'synth-android',
            kuery: `service.version:"1.1" and service.environment: "production"`,
          });

          expect(response.currentPeriod.mostSessions.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostCrashes.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostRequests.timeseries[0].y).to.eql(1);
          expect(response.currentPeriod.mostLaunches.timeseries[0].y).to.eql(1);

          expect(response.currentPeriod.mostSessions.value).to.eql(3);
          expect(response.currentPeriod.mostRequests.value).to.eql(3);
          expect(response.currentPeriod.mostCrashes.value).to.eql(3);
          expect(response.currentPeriod.mostLaunches.value).to.eql(3);
        });
      });
    });
  });
}
