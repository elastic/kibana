/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient } from '@kbn/scout-oblt';
import { globalSetupHook, tags } from '@kbn/scout-oblt';
import { testData } from '../fixtures';

globalSetupHook(
  'Ingest UX test data',
  { tag: tags.stateful.classic },
  async ({ esArchiver, esClient, log }) => {
    const archives = [testData.ES_ARCHIVES.RUM_8_0_0, testData.ES_ARCHIVES.RUM_TEST_DATA];

    log.debug('[setup] loading UX test data (only if indexes do not exist)...');
    for (const archive of archives) {
      await esArchiver.loadIfNeeded(archive);
    }

    log.debug('[setup] indexing INP test transactions...');
    await indexInpTestData(esClient);
  }
);

const INP_VALUES = [
  482, 343, 404, 591, 545, 789, 664, 721, 442, 376, 797, 580, 749, 363, 673, 141, 234, 638, 378,
  448, 175, 543, 665, 146, 742, 686, 210, 324, 365, 192, 301, 317, 728, 655, 427, 66, 741, 357, 732,
  93, 592, 200, 636, 122, 695, 709, 322, 296, 196, 188, 139, 346, 637, 315, 756, 139, 97, 411, 98,
  695, 615, 394, 619, 713, 100, 373, 730, 226, 270, 168, 740, 65, 215, 383, 614, 154, 645, 661, 594,
  71, 264, 377, 599, 92, 771, 474, 566, 106, 192, 491, 121, 210, 690, 310, 753, 266, 289, 743, 134,
  100,
];

function getPageLoadDocument() {
  return {
    '@timestamp': new Date(Date.now()).toISOString(),
    agent: { name: 'rum-js', version: '5.1.1' },
    client: {
      geo: {
        continent_name: 'North America',
        country_iso_code: 'US',
        location: { lat: 37.751, lon: -97.822 },
      },
      ip: '151.101.130.217',
    },
    ecs: { version: '1.5.0' },
    event: {
      ingested: new Date(Date.now()).toISOString(),
      outcome: 'unknown',
    },
    http: {
      request: { referrer: '' },
      response: { decoded_body_size: 813, encoded_body_size: 813, transfer_size: 962 },
    },
    observer: {
      ephemeral_id: '863bfb71-dd0d-4033-833f-f9f3d3b71961',
      hostname: 'eb12315912f8',
      id: '23c1bdbb-6a2a-461a-a71f-6338116b5501',
      type: 'apm-server',
      version: '8.0.0',
      version_major: 8,
    },
    processor: { event: 'transaction', name: 'transaction' },
    service: { language: { name: 'javascript' }, name: 'client', version: '1.0.0' },
    source: { ip: '151.101.130.217' },
    timestamp: { us: 1600080193349369 },
    trace: { id: 'd2f9a6f07ea467c68576ee45b97d9aec' },
    transaction: {
      custom: {
        userConfig: { featureFlags: ['double-trouble', '4423-hotfix'], showDashboard: true },
      },
      duration: { us: 72584 },
      id: '8563bad355ff20f7',
      marks: {
        agent: { domComplete: 61, domInteractive: 51, timeToFirstByte: 3 },
        navigationTiming: {
          connectEnd: 1,
          connectStart: 1,
          domComplete: 61,
          domContentLoadedEventEnd: 51,
          domContentLoadedEventStart: 51,
          domInteractive: 51,
          domLoading: 9,
          domainLookupEnd: 1,
          domainLookupStart: 1,
          fetchStart: 0,
          loadEventEnd: 61,
          loadEventStart: 61,
          requestStart: 1,
          responseEnd: 4,
          responseStart: 3,
        },
      },
      name: '/products',
      page: { referer: '', url: 'http://opbeans-node:3000/products' },
      sampled: true,
      span_count: { started: 5 },
      type: 'page-load',
    },
    url: {
      domain: 'opbeans-node',
      full: 'http://opbeans-node:3000/products',
      original: 'http://opbeans-node:3000/products',
      path: '/products',
      port: 3000,
      scheme: 'http',
    },
    user: { email: 'arthur.dent@example.com', id: '1', name: 'arthurdent' },
    user_agent: {
      device: { name: 'Other' },
      name: 'Chrome',
      original:
        'Mozilla/5.0 (CrKey armv7l 1.5.16041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.0 Safari/537.36',
      os: { name: 'Chromecast' },
      version: '31.0.1650.0',
    },
  };
}

function getPageExitDocument(inpValue: number = 200) {
  const pageLoad = getPageLoadDocument();
  return {
    ...pageLoad,
    transaction: { ...pageLoad.transaction, type: 'page-exit' },
    numeric_labels: { inp_value: inpValue },
  };
}

async function indexInpTestData(esClient: EsClient) {
  const index = 'apm-8.0.0-transaction-000001';

  const { count } = await esClient.count({
    index,
    query: {
      bool: {
        must: [
          { term: { 'transaction.type': 'page-exit' } },
          { exists: { field: 'numeric_labels.inp_value' } },
        ],
      },
    },
  });

  if (count > 0) {
    return;
  }

  const pageLoadDoc = getPageLoadDocument();
  await esClient.index({ index, document: pageLoadDoc });
  for (const inpValue of INP_VALUES) {
    await esClient.index({ index, document: getPageExitDocument(inpValue) });
  }
}
