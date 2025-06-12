/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesCreateRequest } from '@elastic/elasticsearch/lib/api/types';

export const metricbeatIndexCreateRequest: IndicesCreateRequest = {
  index: 'metricbeat-[environment].evaluations-[date]',
  mappings: {
    properties: {
      system: {
        properties: {
          cpu: {
            properties: {
              user: {
                properties: {
                  pct: { type: 'float' },
                },
              },
              system: {
                properties: {
                  pct: { type: 'float' },
                },
              },
              cores: { type: 'integer' },
            },
          },
        },
      },
      host: {
        properties: {
          name: { type: 'keyword' },
        },
      },
    },
  },
};
