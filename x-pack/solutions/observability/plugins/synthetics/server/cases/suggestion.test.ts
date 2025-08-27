/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import type { SuggestionContext } from '@kbn/cases-plugin/common';
import { getMonitorByServiceName } from './suggestion';
import type { ScheduleUnit } from '../../common/runtime_types';

const mockServiceNames = ['test-service-1', 'test-service-2'];
const mockSpaceId = 'default';

const mockElasticsearchHit = {
  _source: {
    monitor: {
      name: 'Test Monitor',
      type: 'http',
      status: 'up',
      id: 'test-monitor-id',
    },
    config_id: 'test-config-id',
    observer: {
      geo: {
        name: 'US East',
      },
      name: 'us-east-1',
    },
    url: {
      full: 'https://example.com',
    },
    '@timestamp': '2024-01-01T00:00:00.000Z',
    meta: {
      space_id: 'default',
    },
    type: 'synthetics',
  },
};

const mockAggregationResponse = {
  aggregations: {
    by_monitor: {
      buckets: [
        {
          key: 'test-monitor',
          latest_run: {
            hits: {
              hits: [mockElasticsearchHit],
            },
          },
        },
      ],
    },
  },
};

const mockSavedObjectAttributes = {
  enabled: true,
  alert: {
    status: {
      enabled: true,
    },
  },
  schedule: {
    number: '5',
    unit: 'm' as ScheduleUnit,
  },
  tags: ['tag1', 'tag2'],
  maintenance_windows: [],
  project_id: 'test-project',
};

const mockSavedObject = {
  id: 'test-config-id',
  type: 'synthetics-monitor',
  attributes: mockSavedObjectAttributes,
  error: undefined,
};

// Mock implementations
const createMockCoreStart = () => {
  const mockSearch = jest.fn();
  const mockBulkGet = jest.fn();

  const coreStart = {
    savedObjects: {
      getScopedClient: jest.fn(() => ({
        bulkGet: mockBulkGet,
      })),
    },
    elasticsearch: {
      client: {
        asScoped: jest.fn(() => ({
          asCurrentUser: {
            search: mockSearch,
          },
        })),
      },
    },
  } as unknown as CoreStart;

  return { coreStart, mockSearch, mockBulkGet };
};

const createMockLogger = (): Logger => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn(),
  get: jest.fn(),
  isLevelEnabled: jest.fn(),
});

const createMockLocatorClient = (): LocatorClient =>
  ({
    get: jest.fn(() => ({
      getRedirectUrl: jest.fn(() => '/app/synthetics/monitor/test-config-id'),
    })),
  } as unknown as LocatorClient);

const createMockRequest = (): KibanaRequest =>
  ({
    url: { pathname: '/test' },
    route: { path: '/test', method: 'get' },
    headers: {},
    isSystemRequest: false,
  } as KibanaRequest);

describe('getMonitorByServiceName', () => {
  let mockCoreStart: CoreStart;
  let mockSearch: jest.Mock;
  let mockBulkGet: jest.Mock;
  let mockLogger: Logger;
  let mockLocatorClient: LocatorClient;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    const mocks = createMockCoreStart();
    mockCoreStart = mocks.coreStart;
    mockSearch = mocks.mockSearch;
    mockBulkGet = mocks.mockBulkGet;

    mockLogger = createMockLogger();
    mockLocatorClient = createMockLocatorClient();
    mockRequest = createMockRequest();
  });

  describe('configuration', () => {
    it('should return correct suggestion type configuration', () => {
      const suggestionType = getMonitorByServiceName(mockCoreStart, mockLogger, mockLocatorClient);

      expect(suggestionType.id).toBe('syntheticMonitorByServiceName');
      expect(suggestionType.attachmentTypeId).toBe('.page');
      expect(suggestionType.owner).toBe('observability');
      expect(suggestionType.handlers).toBeDefined();
      expect(suggestionType.handlers.syntheticMonitorByServiceName).toBeDefined();
    });

    it('should have correct tool description', () => {
      const suggestionType = getMonitorByServiceName(mockCoreStart, mockLogger, mockLocatorClient);

      expect(suggestionType.handlers.syntheticMonitorByServiceName.tool.description).toBe(
        'Suggest Synthetic monitors operating on the same service.'
      );
    });
  });

  describe('handler functionality', () => {
    let handler: any;

    beforeEach(() => {
      const suggestionType = getMonitorByServiceName(mockCoreStart, mockLogger, mockLocatorClient);
      handler = suggestionType.handlers.syntheticMonitorByServiceName.handler;
    });

    it('should return empty suggestions when no service names provided', async () => {
      const context: SuggestionContext = {
        'service.name': [],
        spaceId: mockSpaceId,
      };

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should return empty suggestions when service names is undefined', async () => {
      const context: SuggestionContext = {
        spaceId: mockSpaceId,
      };

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should perform correct Elasticsearch search query', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [mockSavedObject],
      });

      await handler({ context, request: mockRequest });

      expect(mockSearch).toHaveBeenCalledWith({
        index: 'synthetics-*',
        query: {
          bool: {
            filter: [
              {
                terms: {
                  'service.name': mockServiceNames,
                },
              },
              {
                terms: {
                  'meta.space_id': [mockSpaceId],
                },
              },
            ],
          },
        },
        aggs: {
          by_monitor: {
            terms: {
              field: 'observer.name',
              size: 5,
            },
            aggs: {
              latest_run: {
                top_hits: {
                  sort: [
                    {
                      '@timestamp': {
                        order: 'desc',
                      },
                    },
                  ],
                  size: 1,
                  _source: {
                    includes: [
                      'monitor.name',
                      'monitor.type',
                      'monitor.status',
                      'status',
                      'observer.geo.name',
                      'observer.name',
                      'monitor.id',
                      'config_id',
                      'url.full',
                      '@timestamp',
                      'meta.space_id',
                      'type',
                    ],
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should return empty suggestions when no monitors found', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue({
        aggregations: {
          by_monitor: {
            buckets: [],
          },
        },
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `No Synthetics monitors found for service ${mockServiceNames.join(', ')}`
      );
    });

    it('should perform bulk get for saved objects', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [mockSavedObject],
      });

      await handler({ context, request: mockRequest });

      expect(mockBulkGet).toHaveBeenCalledWith([
        {
          id: 'test-config-id',
          type: 'synthetics-monitor-multi-space',
        },
      ]);
    });

    it('should return empty suggestions when no saved objects found', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [],
      });

      // Mock the bulkGetRequests to be empty by returning empty buckets first
      mockSearch.mockResolvedValue({
        aggregations: {
          by_monitor: {
            buckets: [],
          },
        },
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
    });

    it('should create correct suggestion structure', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [mockSavedObject],
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toHaveLength(1);

      const suggestion = result.suggestions[0];
      expect(suggestion.id).toBe('synthetics-monitors-suggestion-test-monitor-id-us-east-1');
      expect(suggestion.componentId).toBe('synthetics');
      expect(suggestion.description).toBe(
        'The synthetics monitor Test Monitor might be related to this case with service test-service-1, test-service-2'
      );
      expect(suggestion.data).toHaveLength(1);
    });

    it('should create correct attachment item structure', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [mockSavedObject],
      });

      const result = await handler({ context, request: mockRequest });

      const attachmentItem = result.suggestions[0].data[0];

      expect(attachmentItem.description).toBe(
        'Synthetic Test Monitor is up for the service: test-service-1,test-service-2 '
      );
      expect(attachmentItem.payload).toMatchObject({
        monitorQueryId: 'test-monitor-id',
        configId: 'test-config-id',
        status: 'up',
        name: 'Test Monitor',
        isEnabled: true,
        isStatusAlertEnabled: true,
        type: 'http',
        schedule: '5',
        tags: ['tag1', 'tag2'],
        maintenanceWindows: [],
        timestamp: '2024-01-01T00:00:00.000Z',
        spaces: 'default',
        locationLabel: 'US East',
        locationId: 'us-east-1',
        urls: 'https://example.com',
        projectId: 'test-project',
      });

      expect(attachmentItem.attachment).toMatchObject({
        type: 'persistableState',
        persistableStateAttachmentTypeId: '.page',
        persistableStateAttachmentState: {
          type: 'synthetics_history',
          url: {
            pathAndQuery: '/app/synthetics/monitor/test-config-id',
            label: 'Test Monitor',
            actionLabel: 'Go to Synthetics monitor overview of Test Monitor',
            iconType: 'metricbeatApp',
          },
        },
      });
    });

    it('should handle missing optional fields in monitor status', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      const incompleteHit = {
        _source: {
          ...mockElasticsearchHit._source,
          monitor: {
            status: undefined,
          },
        },
      };

      mockSearch.mockResolvedValue({
        aggregations: {
          by_monitor: {
            buckets: [
              {
                key: 'test-monitor',
                latest_run: {
                  hits: {
                    hits: [incompleteHit],
                  },
                },
              },
            ],
          },
        },
      });

      const savedObjectWithMissingFields = {
        ...mockSavedObject,
        attributes: {
          ...mockSavedObjectAttributes,
          alert: undefined,
          tags: undefined,
          maintenance_windows: undefined,
        },
      };

      mockBulkGet.mockResolvedValue({
        saved_objects: [savedObjectWithMissingFields],
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toHaveLength(1);
      const payload = result.suggestions[0].data[0].payload;
      expect(payload.status).toBe('unknown');
      expect(payload.isStatusAlertEnabled).toBe(false);
      expect(payload.tags).toEqual([]);
      expect(payload.maintenanceWindows).toEqual([]);
    });

    it('should handle multiple monitors correctly', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      const multipleMonitorsResponse = {
        aggregations: {
          by_monitor: {
            buckets: [
              {
                key: 'monitor-1',
                latest_run: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          ...mockElasticsearchHit._source,
                          config_id: 'monitor-1-id',
                          monitor: {
                            id: 'monitor-1-id',
                            name: 'Monitor 1',
                          },
                        },
                      },
                    ],
                  },
                },
              },
              {
                key: 'monitor-2',
                latest_run: {
                  hits: {
                    hits: [
                      {
                        _source: {
                          ...mockElasticsearchHit._source,
                          config_id: 'monitor-2-id',
                          monitor: {
                            id: 'monitor-2-id',
                            name: 'Monitor 2',
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
          },
        },
      };

      mockSearch.mockResolvedValue(multipleMonitorsResponse);
      mockBulkGet.mockResolvedValue({
        saved_objects: [
          { ...mockSavedObject, id: 'monitor-1-id' },
          { ...mockSavedObject, id: 'monitor-2-id' },
        ],
      });

      const result = await handler({ context, request: mockRequest });
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].data[0].payload.name).toBe('Monitor 1');
      expect(result.suggestions[1].data[0].payload.name).toBe('Monitor 2');
    });
  });

  describe('error handling', () => {
    let handler: any;

    beforeEach(() => {
      const suggestionType = getMonitorByServiceName(mockCoreStart, mockLogger, mockLocatorClient);
      handler = suggestionType.handlers.syntheticMonitorByServiceName.handler;
    });

    it('should handle Elasticsearch search errors', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      const searchError = new Error('Elasticsearch error');
      mockSearch.mockRejectedValue(searchError);

      await expect(handler({ context, request: mockRequest })).rejects.toThrow(
        'Elasticsearch error'
      );
    });

    it('should handle saved objects bulk get errors', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      const bulkGetError = new Error('Saved objects error');
      mockBulkGet.mockRejectedValue(bulkGetError);

      await expect(handler({ context, request: mockRequest })).rejects.toThrow(
        'Saved objects error'
      );
    });
  });
});
