/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexRequest } from '@elastic/elasticsearch/lib/api/types';

export const metricsApmIndexRequest: IndexRequest = {
  index: 'metrics-apm-[environment].evaluations.[date]',
  document: {
    '@timestamp': '2024-04-02T12:00:00.000Z',
    metricset: {
      name: 'app',
      interval: '1m',
    },
    transaction: {
      duration: {
        us: 13980,
      },
    },
  },
};
