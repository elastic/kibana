/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type { LocatorClient } from '@kbn/share-plugin/common/url_service';
import type { SuggestionContext } from '@kbn/cases-plugin/common';
import { getMonitors } from './suggestion';
import type { ScheduleUnit } from '../../common/runtime_types';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';

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
    service: {
      name: 'Test Service',
    },
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
  spaces: [mockSpaceId],
};

const mockSavedObject = {
  id: 'test-config-id',
  type: 'synthetics-monitor',
  attributes: mockSavedObjectAttributes,
  error: undefined,
};

const mockMonitorConfigRepositoryFind = jest.fn();
jest.mock('../services/monitor_config_repository', () => ({
  MonitorConfigRepository: jest.fn().mockImplementation(() => ({
    find: mockMonitorConfigRepositoryFind,
  })),
}));

// Mock implementations
const createMockCoreStart = () => {
  const mockSearch = jest.fn();

  const coreStart = {
    savedObjects: {
      getScopedClient: jest.fn(() => ({})),
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

  return { coreStart, mockSearch };
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

const createMockEncryptedSavedObjectsStart = (): EncryptedSavedObjectsPluginStart => {
  return {
    isEncryptionError: jest.fn(() => false),
    getClient: jest.fn(() => ({
      getDecryptedAsInternalUser: jest.fn(),
      getDecryptedAsSOClient: jest.fn(),
      createPointInTimeFinderDecryptedAsInternalUser: jest.fn(),
    })),
  } as unknown as EncryptedSavedObjectsPluginStart;
};

describe('getMonitors', () => {
  let mockCoreStart: CoreStart;
  let mockSearch: jest.Mock;
  let mockLogger: Logger;
  let mockLocatorClient: LocatorClient;
  let mockRequest: KibanaRequest;
  let encryptedSavedObjects: EncryptedSavedObjectsPluginStart;

  beforeEach(() => {
    jest.clearAllMocks();

    const mocks = createMockCoreStart();
    mockCoreStart = mocks.coreStart;
    mockSearch = mocks.mockSearch;

    mockLogger = createMockLogger();
    mockLocatorClient = createMockLocatorClient();
    mockRequest = createMockRequest();
    encryptedSavedObjects = createMockEncryptedSavedObjectsStart();

    // Default mock implementation for MonitorConfigRepository.find
    mockMonitorConfigRepositoryFind.mockResolvedValue({
      total: 1,
      saved_objects: [mockSavedObject],
      per_page: 10,
      page: 1,
    });
  });

  describe('configuration', () => {
    it('should return correct suggestion type configuration', () => {
      const suggestionType = getMonitors(
        mockCoreStart,
        mockLogger,
        encryptedSavedObjects,
        mockLocatorClient
      );

      expect(suggestionType.id).toBe('syntheticMonitor');
      expect(suggestionType.attachmentTypeId).toBe('.page');
      expect(suggestionType.owner).toBe('observability');
      expect(suggestionType.handlers).toBeDefined();
      expect(suggestionType.handlers.syntheticMonitor).toBeDefined();
    });

    it('should have correct tool description', () => {
      const suggestionType = getMonitors(
        mockCoreStart,
        mockLogger,
        encryptedSavedObjects,
        mockLocatorClient
      );

      expect(suggestionType.handlers.syntheticMonitor.tool.description).toBe(
        'Suggest Synthetic monitors operating on the same service.'
      );
    });
  });

  describe('handler functionality', () => {
    let handler: any;

    beforeEach(() => {
      const suggestionType = getMonitors(
        mockCoreStart,
        mockLogger,
        encryptedSavedObjects,
        mockLocatorClient
      );
      handler = suggestionType.handlers.syntheticMonitor.handler;
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
              {
                terms: {
                  'summary.final_attempt': [true],
                },
              },
            ],
          },
        },
        aggs: {
          by_monitor: {
            terms: {
              field: 'config_id',
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
                      'observer.geo.name',
                      'observer.name',
                      'service.name',
                      'monitor.id',
                      'config_id',
                      'url.full',
                      '@timestamp',
                      'meta.space_id',
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

    it('should return empty suggestions when no saved objects found', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockMonitorConfigRepositoryFind.mockResolvedValue({
        total: 0,
        saved_objects: [],
        per_page: 10,
        page: 1,
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'No Synthetics SavedObjects found for the related tests runs'
      );
    });

    it('should create correct suggestion structure', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toHaveLength(1);

      const suggestion = result.suggestions[0];
      expect(suggestion.id).toBe(
        'synthetics-monitors-suggestion-test-monitor-id-us-east-1-Test Service'
      );
      expect(suggestion.componentId).toBe('synthetics');
      expect(suggestion.description).toBe(
        'The synthetics monitor Test Monitor might be related to this case with service Test Service'
      );
      expect(suggestion.data).toHaveLength(1);
    });

    it('should create correct attachment item structure', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);

      const result = await handler({ context, request: mockRequest });

      const attachmentItem = result.suggestions[0].data[0];

      expect(attachmentItem.description).toBe(
        'Synthetic Test Monitor is up for the service: Test Service'
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
        spaces: ['default'],
        locationLabel: 'US East',
        locationId: 'us-east-1',
        urls: 'https://example.com',
        projectId: 'test-project',
        service: { name: 'Test Service' },
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
            ...mockElasticsearchHit._source.monitor,
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

      mockMonitorConfigRepositoryFind.mockResolvedValue({
        total: 1,
        saved_objects: [savedObjectWithMissingFields],
        per_page: 10,
        page: 1,
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
                            ...mockElasticsearchHit._source.monitor,
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
                            ...mockElasticsearchHit._source.monitor,
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
      mockMonitorConfigRepositoryFind.mockResolvedValue({
        total: 2,
        saved_objects: [
          { ...mockSavedObject, id: 'monitor-1-id' },
          { ...mockSavedObject, id: 'monitor-2-id' },
        ],
        per_page: 10,
        page: 1,
      });

      const result = await handler({ context, request: mockRequest });
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].data[0].payload.name).toBe('Monitor 1');
      expect(result.suggestions[1].data[0].payload.name).toBe('Monitor 2');
    });

    it('should skip monitors with saved object errors', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      mockMonitorConfigRepositoryFind.mockResolvedValue({
        total: 1,
        saved_objects: [
          {
            ...mockSavedObject,
            error: { error: 'Not found', message: 'Saved object not found', statusCode: 404 },
          },
        ],
        per_page: 10,
        page: 1,
      });

      const result = await handler({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No related saved object found for config_id test-config-id - possible deleted config, old run etc.'
      );
    });
  });

  describe('error handling', () => {
    let handler: any;

    beforeEach(() => {
      const suggestionType = getMonitors(
        mockCoreStart,
        mockLogger,
        encryptedSavedObjects,
        mockLocatorClient
      );
      handler = suggestionType.handlers.syntheticMonitor.handler;
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

    it('should handle MonitorConfigRepository.find errors', async () => {
      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);
      const repositoryError = new Error('Repository error');
      mockMonitorConfigRepositoryFind.mockRejectedValue(repositoryError);

      await expect(handler({ context, request: mockRequest })).rejects.toThrow('Repository error');
    });

    it('should handle missing locator gracefully', async () => {
      const suggestionTypeWithoutLocator = getMonitors(
        mockCoreStart,
        mockLogger,
        encryptedSavedObjects
      );
      const handlerWithoutLocator = suggestionTypeWithoutLocator.handlers.syntheticMonitor.handler;

      const context: SuggestionContext = {
        'service.name': mockServiceNames,
        spaceId: mockSpaceId,
      };

      mockSearch.mockResolvedValue(mockAggregationResponse);

      const result = await handlerWithoutLocator({ context, request: mockRequest });

      expect(result.suggestions).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'No URL found for monitor Test Monitor with service Test Service'
      );
    });
  });
});
