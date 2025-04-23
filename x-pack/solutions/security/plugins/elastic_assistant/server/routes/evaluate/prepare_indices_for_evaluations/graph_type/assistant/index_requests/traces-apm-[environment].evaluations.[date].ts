/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexRequest } from '@elastic/elasticsearch/lib/api/types';

export const tracesApmIndexRequest: IndexRequest = {
  index: 'traces-apm-[environment].evaluations.[date]',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    event: {
      outcome: 'success',
    },
    transaction: {
      duration: {
        us: 1000,
      },
      transaction: { id: '945254c567a5417e' },
      service: { name: 'my-service' },
    },
  },
};
