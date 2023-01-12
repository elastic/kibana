/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const esPackageResponse = () => {
  //   const esIndex = `.ds-metrics-elasticsearch.stack_monitoring.node-default-${date}-000001`;

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
          node: [
            {
              lastSeen: '2023-01-12T15:18:48.533Z',
              message:
                'error determining if connected Elasticsearch node is master: error making http request: Get "http://localhost:9200/_nodes/_local/nodes": dial tcp [::1]:9200: connect: cannot assign requested address',
            },
          ],
          node_stats: [
            {
              lastSeen: '2023-01-12T15:18:48.796Z',
              message:
                'error determining if connected Elasticsearch node is master: error making http request: Get "http://localhost:9200/_nodes/_local/nodes": dial tcp [::1]:9200: connect: cannot assign requested address',
            },
          ],
        },
      },
    },
  };
};
