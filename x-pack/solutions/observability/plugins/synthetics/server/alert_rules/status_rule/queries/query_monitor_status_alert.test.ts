/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsFindResult } from '@kbn/core/server';
import { Logger } from '@kbn/core/server';
import { queryMonitorStatusAlert } from './query_monitor_status_alert';
import { EncryptedSyntheticsMonitorAttributes } from '../../../../common/runtime_types';
import { SyntheticsEsClient } from '../../../lib';

// Mock the logger
const createLoggerMock = () => {
  return {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
};

// Mock the ES client
const createEsClientMock = () => {
  return {
    search: jest.fn(),
  } as unknown as SyntheticsEsClient;
};

describe('queryMonitorStatusAlert', () => {
  const esClient = createEsClientMock();
  const logger = createLoggerMock();

  // Mock Date to return a fixed timestamp for 2025-05-27T14:25:00Z
  const fixedDateString = '2025-05-27T14:25:00Z';
  let originalDate: DateConstructor;

  beforeEach(() => {
    originalDate = global.Date;
    // @ts-ignore - We need to mock the Date constructor
    global.Date = class extends originalDate {
      constructor(date?: string | number | Date) {
        if (date !== undefined) {
          // If a date is provided, use the original Date behavior
          super(date);
        } else {
          // If no date is provided, return our fixed date
          super(fixedDateString);
        }
      }
    } as DateConstructor;
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.Date = originalDate;
  });

  it('returns empty configs when no monitors are found', async () => {
    // Mock ES client to return empty results
    esClient.search = jest.fn().mockResolvedValue({
      body: {
        aggregations: {
          id: {
            buckets: [],
          },
        },
      },
    });

    const result = await queryMonitorStatusAlert({
      esClient,
      monitorLocationIds: ['location1'],
      range: { from: '2025-05-27T13:30:00Z', to: '2025-05-27T14:30:00Z' },
      monitorQueryIds: ['monitor1'],
      numberOfChecks: 3,
      monitorsData: {
        monitor1: { scheduleInMs: 60000, locations: ['location1'], type: 'http' },
      },
      monitors: [],
      logger,
    });

    expect(result).toEqual({
      upConfigs: {},
      downConfigs: {},
      pendingConfigs: {},
      enabledMonitorQueryIds: ['monitor1'],
      configStats: {
        monitor1: { up: 0, down: 0, pending: 0 },
      },
    });

    expect(esClient.search).toHaveBeenCalledWith(
      {
        body: {
          size: 0,
          query: {
            bool: {
              filter: [
                {
                  exists: {
                    field: 'summary',
                  },
                },
                {
                  range: {
                    '@timestamp': { gte: expect.any(String), lte: expect.any(String) },
                  },
                },
                {
                  terms: {
                    'monitor.id': ['monitor1'],
                  },
                },
                {
                  terms: {
                    'observer.name': ['location1'],
                  },
                },
              ],
            },
          },
          aggs: {
            id: {
              terms: {
                field: 'monitor.id',
                size: 10000,
              },
              aggs: {
                location: {
                  terms: {
                    field: 'observer.name',
                    size: 1,
                  },
                  aggs: {
                    downChecks: {
                      filter: {
                        range: {
                          'summary.down': {
                            gte: '1',
                          },
                        },
                      },
                    },
                    totalChecks: {
                      top_hits: {
                        size: 3,
                        sort: [
                          {
                            '@timestamp': {
                              order: 'desc',
                            },
                          },
                        ],
                        _source: {
                          includes: [
                            '@timestamp',
                            'summary',
                            'monitor',
                            'observer',
                            'config_id',
                            'error',
                            'agent',
                            'url',
                            'state',
                            'tags',
                            'service',
                            'labels',
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      'Monitors status rule query'
    );
  });

  it('classifies monitors as up, down, or pending based on ping data', async () => {
    // Mock ES client to return ping data
    esClient.search = jest.fn().mockResolvedValue({
      body: {
        aggregations: {
          id: {
            buckets: [
              {
                key: 'monitor1',
                location: {
                  buckets: [
                    {
                      key: 'location1',
                      totalChecks: {
                        hits: {
                          hits: [
                            {
                              _source: {
                                '@timestamp': '2025-05-27T14:25:00Z',
                                config_id: 'monitor1',
                                monitor: { id: 'monitor1' },
                                summary: { up: 1, down: 0 },
                              },
                            },
                          ],
                        },
                      },
                      downChecks: { doc_count: 0 },
                    },
                    {
                      key: 'location2',
                      totalChecks: {
                        hits: {
                          hits: [
                            {
                              _source: {
                                '@timestamp': '2025-05-27T14:25:00Z',
                                config_id: 'monitor1',
                                monitor: { id: 'monitor1' },
                                summary: { up: 0, down: 1 },
                              },
                            },
                          ],
                        },
                      },
                      downChecks: { doc_count: 1 },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });

    // Create monitor data
    const monitors: Array<SavedObjectsFindResult<EncryptedSyntheticsMonitorAttributes>> = [
      {
        id: 'monitor1',
        type: 'synthetics-monitor',
        attributes: {
          name: 'Monitor 1',
          type: 'http',
          locations: [
            { id: 'location1', label: 'Location 1' },
            { id: 'location2', label: 'Location 2' },
            { id: 'location3', label: 'Location 3' }, // This will be pending
          ],
        } as unknown as EncryptedSyntheticsMonitorAttributes,
        references: [],
        created_at: '2025-05-27T12:00:00.000Z',
        updated_at: '2025-05-27T12:00:00.000Z',
        version: '1',
        score: 1,
      },
    ];

    const result = await queryMonitorStatusAlert({
      esClient,
      monitorLocationIds: ['location1', 'location2', 'location3'],
      range: { from: '2025-05-27T13:30:00Z', to: '2025-05-27T14:30:00Z' },
      monitorQueryIds: ['monitor1'],
      numberOfChecks: 3,
      monitorsData: {
        monitor1: {
          scheduleInMs: 300000,
          locations: ['location1', 'location2', 'location3'],
          type: 'http',
        },
      },
      monitors,
      logger,
    });

    // Verify up configs
    expect(Object.keys(result.upConfigs)).toContain('monitor1-location1');
    expect(result.upConfigs['monitor1-location1'].status).toBe('up');

    // Verify down configs
    expect(Object.keys(result.downConfigs)).toContain('monitor1-location2');
    expect(result.downConfigs['monitor1-location2'].status).toBe('down');

    // Verify pending configs (location3 should be pending since it has no ping data)
    expect(Object.keys(result.pendingConfigs)).toContain('monitor1-location3');
    expect(result.pendingConfigs['monitor1-location3'].status).toBe('pending');

    // Verify config stats
    expect(result.configStats.monitor1).toEqual({
      up: 1,
      down: 1,
      pending: 1,
    });
  });
});
