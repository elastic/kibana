/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APM_METRIC_INDEX_NAME } from '../../constants';
import { GetService } from '../../types';

export const createApmMetricIndex = async (getService: GetService) => {
  const es = getService('es');
  await es.indices.create({
    index: APM_METRIC_INDEX_NAME,
    body: {
      mappings: {
        dynamic: 'strict',
        properties: {
          event: {
            properties: {
              outcome: {
                type: 'keyword',
              },
            },
          },
          processor: {
            properties: {
              event: {
                type: 'keyword',
              },
            },
          },
          observer: {
            properties: {
              version_major: {
                type: 'byte',
              },
            },
          },
          service: {
            properties: {
              name: {
                type: 'keyword',
              },
              environment: {
                type: 'keyword',
              },
            },
          },
          transaction: {
            properties: {
              type: {
                type: 'keyword',
              },
              duration: {
                properties: {
                  histogram: {
                    type: 'histogram',
                  },
                },
              },
            },
          },
          '@timestamp': {
            type: 'date',
          },
        },
      },
    },
  });
};
