/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockAutoOpsResponse = {
  ingest_rate: [
    {
      name: 'metrics-system.cpu-default',
      error: null,
      data: [
        [1726858530000, 13756849],
        [1726862130000, 14657904],
      ],
    },
    {
      name: 'logs-nginx.access-default',
      error: null,
      data: [
        [1726858530000, 12894623],
        [1726862130000, 14436905],
      ],
    },
  ],
  storage_retained: [
    {
      name: 'metrics-system.cpu-default',
      error: null,
      data: [
        [1726858530000, 12576413],
        [1726862130000, 13956423],
      ],
    },
    {
      name: 'logs-nginx.access-default',
      error: null,
      data: [
        [1726858530000, 12894623],
        [1726862130000, 14436905],
      ],
    },
  ],
};
