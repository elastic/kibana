/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLastSuccessfulStepParams,
  LAST_SUCCESSFUL_CHECK_LOOKBACK_MS,
} from './get_last_successful_check';

const lookbackStart = (timestamp: string) =>
  new Date(new Date(timestamp).getTime() - LAST_SUCCESSFUL_CHECK_LOOKBACK_MS).toISOString();

describe('getLastSuccessfulStep', () => {
  describe('getLastSuccessfulStepParams', () => {
    it('formats ES params with location', () => {
      const monitorId = 'my-monitor';
      const location = 'au-heartbeat';
      const timestamp = '2021-10-31T19:47:52.392Z';
      const params = getLastSuccessfulStepParams({
        monitorId,
        location,
        timestamp,
      });

      expect(params).toEqual({
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: lookbackStart(timestamp),
                    lte: '2021-10-31T19:47:52.392Z',
                  },
                },
              },
              {
                term: {
                  'monitor.id': 'my-monitor',
                },
              },
              {
                term: {
                  'synthetics.type': 'heartbeat/summary',
                },
              },
              {
                range: {
                  'summary.down': {
                    lte: '0',
                  },
                },
              },
              {
                term: {
                  'observer.geo.name': 'au-heartbeat',
                },
              },
            ],
          },
        },
        size: 1,
        track_total_hits: false,
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      });
    });

    it('formats ES params without location', () => {
      const params = getLastSuccessfulStepParams({
        monitorId: 'my-monitor',
        location: undefined,
        timestamp: '2021-10-31T19:47:52.392Z',
      });

      expect(params).toEqual({
        query: {
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: lookbackStart('2021-10-31T19:47:52.392Z'),
                    lte: '2021-10-31T19:47:52.392Z',
                  },
                },
              },
              {
                term: {
                  'monitor.id': 'my-monitor',
                },
              },
              {
                term: {
                  'synthetics.type': 'heartbeat/summary',
                },
              },
              {
                range: {
                  'summary.down': {
                    lte: '0',
                  },
                },
              },
            ],
            must_not: {
              exists: {
                field: 'observer.geo.name',
              },
            },
          },
        },
        size: 1,
        track_total_hits: false,
        sort: [
          {
            '@timestamp': {
              order: 'desc',
            },
          },
        ],
      });
    });
  });
});
