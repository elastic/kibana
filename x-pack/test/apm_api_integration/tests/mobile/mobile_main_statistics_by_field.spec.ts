/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { ENVIRONMENT_ALL } from '@kbn/apm-plugin/common/environment_filter_values';
import { FtrProviderContext } from '../../common/ftr_provider_context';

const GALAXY_DURATION = 500;
const HUAWEI_DURATION = 20;
const TRANSACTIONS_COUNT = 3;
const SERVICE_VERSIONS = ['1.0', '2.0'];
const OS_VERSIONS = ['10', '11'];
// we generate 3 transactions per each mobile device
// timerange 15min, interval 5m, rate 1
function calculateLatency(duration: number) {
  return ((duration * TRANSACTIONS_COUNT) / TRANSACTIONS_COUNT) * 1000; // convert to microseconds
}

function calculateThroughput({ start, end }: { start: number; end: number }) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return TRANSACTIONS_COUNT / durationAsMinutes;
}

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
    .mobileDevice({ serviceVersion: SERVICE_VERSIONS[0] })
    .deviceInfo({
      manufacturer: 'Samsung',
      modelIdentifier: 'SM-G973F',
      modelName: 'Galaxy S10',
    })
    .osInfo({
      osType: 'android',
      osVersion: OS_VERSIONS[0],
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
    .mobileDevice({ serviceVersion: SERVICE_VERSIONS[1] })
    .deviceInfo({
      manufacturer: 'Huawei',
      modelIdentifier: 'HUAWEI P2-0000',
      modelName: 'HuaweiP2',
    })
    .osInfo({
      osType: 'android',
      osVersion: OS_VERSIONS[1],
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
            .errors(galaxy10.crash({ message: 'error' }).timestamp(timestamp))
            .timestamp(timestamp)
            .duration(500)
            .success(),
          huaweiP2
            .transaction('Start View - View Appearing', 'huaweiP2 Activity')
            .errors(huaweiP2.crash({ message: 'error' }).timestamp(timestamp))
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
  const apmSynthtraceEsClient = getService('apmSynthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileMainStatisticsByField({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    field,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    field: string;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/main_statistics',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            field,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when(
    'Mobile main statistics when data is not loaded',
    { config: 'basic', archives: [] },
    () => {
      describe('when no data', () => {
        it('handles empty state', async () => {
          const response = await getMobileMainStatisticsByField({
            serviceName: 'foo',
            field: 'service.version',
          });
          expect(response.mainStatistics.length).to.be(0);
        });
      });
    }
  );

  // FLAKY: https://github.com/elastic/kibana/issues/177395
  registry.when.skip('Mobile main statistics', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateData({
        apmSynthtraceEsClient,
        start,
        end,
      });
    });

    after(() => apmSynthtraceEsClient.clean());

    describe('when data is loaded', () => {
      const huaweiLatency = calculateLatency(HUAWEI_DURATION);
      const galaxyLatency = calculateLatency(GALAXY_DURATION);
      const huaweiThroughput = calculateThroughput({ start, end });
      const galaxyThroughput = calculateThroughput({ start, end });

      it('returns the correct data for App version', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'service.version',
        });
        const fieldValues = response.mainStatistics.map((item) => item.name);

        expect(fieldValues).to.be.eql(SERVICE_VERSIONS);

        const latencyValues = response.mainStatistics.map((item) => item.latency);

        expect(latencyValues).to.be.eql([galaxyLatency, huaweiLatency]);

        const throughputValues = response.mainStatistics.map((item) => item.throughput);
        expect(throughputValues).to.be.eql([galaxyThroughput, huaweiThroughput]);
      });
      it('returns the correct data for Os version', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'host.os.version',
        });

        const fieldValues = response.mainStatistics.map((item) => item.name);

        expect(fieldValues).to.be.eql(OS_VERSIONS);

        const latencyValues = response.mainStatistics.map((item) => item.latency);

        expect(latencyValues).to.be.eql([galaxyLatency, huaweiLatency]);

        const throughputValues = response.mainStatistics.map((item) => item.throughput);
        expect(throughputValues).to.be.eql([galaxyThroughput, huaweiThroughput]);
      });
      it('returns the correct data for Devices', async () => {
        const response = await getMobileMainStatisticsByField({
          serviceName: 'synth-android',
          environment: 'production',
          field: 'device.model.identifier',
        });
        const fieldValues = response.mainStatistics.map((item) => item.name);

        expect(fieldValues).to.be.eql(['HUAWEI P2-0000', 'SM-G973F']);

        const latencyValues = response.mainStatistics.map((item) => item.latency);

        expect(latencyValues).to.be.eql([huaweiLatency, galaxyLatency]);

        const throughputValues = response.mainStatistics.map((item) => item.throughput);
        expect(throughputValues).to.be.eql([huaweiThroughput, galaxyThroughput]);
      });
    });
  });
}
