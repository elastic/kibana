/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const esPackageResponse = () => {
  return {
    monitoredClusters: {
      clusters: {
        standalone: {},
      },
      execution: {
        timedOut: false,
        errors: [],
      },
    },
    metricbeatErrors: {
      execution: {
        errors: [],
        timedOut: false,
      },
      products: {},
    },
    packageErrors: {
      execution: {
        errors: [],
        timedOut: false,
      },
      products: {
        elasticsearch: {
          'elasticsearch.stack_monitoring.node_stats': [
            {
              lastSeen: '2023-01-13T15:11:40.458Z',
              message:
                'error making http request: Get "http://localhost:9200/_nodes/_local/stats": dial tcp [::1]:9200: connect: cannot assign requested address',
            },
            {
              lastSeen: '2023-01-13T15:11:30.458Z',
              message:
                'error making http request: Get "http://localhost:9200/_nodes/_local/stats": dial tcp 127.0.0.1:9200: connect: connection refused',
            },
          ],
        },
      },
    },
  };
};
