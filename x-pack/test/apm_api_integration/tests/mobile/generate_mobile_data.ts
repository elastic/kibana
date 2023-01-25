/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { ApmSynthtraceEsClient } from '@kbn/apm-synthtrace';

export async function generateMobileData({
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
    .mobileDevice()
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
    .setNetworkConnection({ type: 'wifi' });

  const galaxy7 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
      agentName: 'android/java',
    })
    .mobileDevice()
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

  return await synthtraceEsClient.index([
    timerange(start, end)
      .interval('5m')
      .rate(1)
      .generator((timestamp) => {
        galaxy10.startNewSession();
        galaxy7.startNewSession();
        return [
          galaxy10
            .transaction('Start View - View Appearing', 'Android Activity')
            .timestamp(timestamp)
            .duration(500)
            .success()
            .children(
              galaxy10
                .span({
                  spanName: 'onCreate',
                  spanType: 'app',
                  spanSubtype: 'external',
                  'service.target.type': 'http',
                  'span.destination.service.resource': 'external',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 20),
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
          galaxy10
            .transaction('Second View - View Appearing', 'Android Activity')
            .timestamp(10000 + timestamp)
            .duration(300)
            .failure()
            .children(
              galaxy10
                .httpSpan({
                  spanName: 'GET backend:1234',
                  httpMethod: 'GET',
                  httpUrl: 'https://backend:1234/api/second',
                })
                .duration(400)
                .success()
                .timestamp(10000 + timestamp + 250)
            ),
          galaxy7
            .transaction('Start View - View Appearing', 'Android Activity')
            .timestamp(timestamp)
            .duration(20)
            .success()
            .children(
              galaxy7
                .span({
                  spanName: 'onCreate',
                  spanType: 'app',
                  spanSubtype: 'external',
                  'service.target.type': 'http',
                  'span.destination.service.resource': 'external',
                })
                .duration(50)
                .success()
                .timestamp(timestamp + 20),
              galaxy7
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
