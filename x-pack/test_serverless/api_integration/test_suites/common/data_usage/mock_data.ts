/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';

export const mockAutoOpsResponse = {
  metrics: {
    ingest_rate: [
      {
        name: 'metrics-system.cpu-default',
        data: [
          [1726858530000, 13756849],
          [1726862130000, 14657904],
        ],
      },
      {
        name: 'logs-nginx.access-default',
        data: [
          [1726858530000, 12894623],
          [1726862130000, 14436905],
        ],
      },
    ],
    storage_retained: [
      {
        name: 'metrics-system.cpu-default',
        data: [
          [1726858530000, 12576413],
          [1726862130000, 13956423],
        ],
      },
      {
        name: 'logs-nginx.access-default',
        data: [
          [1726858530000, 12894623],
          [1726862130000, 14436905],
        ],
      },
    ],
  },
};

export const createDataStreams = async (es: Client) => {
  const dataStreamNames = new Set<string>(
    dataStreamsMockResponse.map((dataStream) => dataStream.name)
  );

  for (const name of dataStreamNames) {
    try {
      await es.indices.createDataStream({ name });
    } catch (e) {
      throw e;
    }
  }
};

export const deleteDataStreams = async (es: Client) => {
  const dataStreamNames = new Set<string>(
    dataStreamsMockResponse.map((dataStream) => dataStream.name)
  );

  for (const name of dataStreamNames) {
    try {
      await es.indices.deleteDataStream({ name });
    } catch (e) {
      throw e;
    }
  }
};

export const dataStreamsMockResponse = [
  {
    name: 'metrics-system.cpu-default',
    storageSizeBytes: 6197,
  },
  {
    name: 'metrics-system.core.total.pct-default',
    storageSizeBytes: 5197,
  },
  {
    name: 'logs-nginx.access-default',
    storageSizeBytes: 1938,
  },
];
