/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

export const esBeatsResponse = (date = moment().format('YYYY.MM.DD')) => {
  const esIndex = `.ds-.monitoring-es-8-mb-${date}-000001`;
  const beatsIndex = `.ds-.monitoring-beats-8-mb-${date}-000001`;

  return {
    monitoredClusters: {
      clusters: {
        tqiiSubfSgWrl68VJn4y2g: {
          cluster: {
            tqiiSubfSgWrl68VJn4y2g: {
              index_summary: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:10:15.135Z',
                },
              },
              index_recovery: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:10:13.584Z',
                },
              },
              index: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:10:11.994Z',
                },
              },
              cluster_stats: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:10:18.917Z',
                },
              },
            },
          },
          elasticsearch: {
            QR7smK2oReK_jWHtt5UOSQ: {
              node_stats: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:10:14.268Z',
                },
              },
              shard: {
                'metricbeat-8': {
                  index: esIndex,
                  lastSeen: '2022-05-23T22:09:48.321Z',
                },
              },
            },
          },
          beats: {
            'metricbeat|726039e5-67fe-4e78-837f-072cf2ba0fe7': {
              stats: {
                'metricbeat-8': {
                  index: beatsIndex,
                  lastSeen: '2022-05-23T22:17:10.622Z',
                },
              },
              state: {
                'metricbeat-8': {
                  index: beatsIndex,
                  lastSeen: '2022-05-23T22:17:08.837Z',
                },
              },
            },
          },
        },
      },
      execution: {
        timedOut: false,
        errors: [],
      },
    },
  };
};
