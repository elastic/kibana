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
  const synthtraceEsClient = getService('synthtraceEsClient');

  const start = new Date('2023-01-01T00:00:00.000Z').getTime();
  const end = new Date('2023-01-01T00:15:00.000Z').getTime() - 1;

  async function getMobileTermsByField({
    environment = ENVIRONMENT_ALL.value,
    kuery = '',
    serviceName,
    fieldName,
    size,
  }: {
    environment?: string;
    kuery?: string;
    serviceName: string;
    fieldName: string;
    size: number;
  }) {
    return await apmApiClient
      .readUser({
        endpoint: 'GET /internal/apm/mobile-services/{serviceName}/terms',
        params: {
          path: { serviceName },
          query: {
            environment,
            start: new Date(start).toISOString(),
            end: new Date(end).toISOString(),
            kuery,
            size,
            fieldName,
          },
        },
      })
      .then(({ body }) => body);
  }

  registry.when('Mobile terms when data is not loaded', { config: 'basic', archives: [] }, () => {
    describe('when no data', () => {
      it('handles empty state', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'foo',
          fieldName: 'bar',
          size: 1,
        });
        expect(response.terms).to.eql([]);
      });

      it('handles empty fieldName', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          fieldName: '',
          size: 1,
        });
        expect(response.terms).to.eql([]);
      });
    });
  });

  // FLAKY: https://github.com/elastic/kibana/issues/177498
  registry.when('Mobile terms', { config: 'basic', archives: [] }, () => {
    before(async () => {
      await generateData({
        synthtraceEsClient,
        start,
        end,
      });
    });

    after(() => synthtraceEsClient.clean());

    describe('when data is loaded', () => {
      it('returns mobile devices', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'device.model.identifier',
          size: 10,
        });
        expect(response.terms).to.eql([
          { label: 'HUAWEI P2-0000', count: 3 },
          { label: 'SM-G973F', count: 3 },
        ]);
      });

      it('returns mobile versions', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'service.version',
          size: 10,
        });
        expect(response.terms).to.eql([
          {
            label: '1.2',
            count: 3,
          },
          {
            label: '2.3',
            count: 3,
          },
        ]);
      });

      it('return the most used mobile version', async () => {
        const response = await getMobileTermsByField({
          serviceName: 'synth-android',
          environment: 'production',
          fieldName: 'service.version',
          size: 1,
        });
        expect(response.terms).to.eql([
          {
            label: '1.2',
            count: 3,
          },
        ]);
      });
    });
  });
}
