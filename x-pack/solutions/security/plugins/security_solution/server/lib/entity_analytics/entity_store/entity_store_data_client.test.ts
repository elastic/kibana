/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  elasticsearchServiceMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { EntityStoreDataClient } from './entity_store_data_client';
import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../..';
import type { EntityStoreConfig } from './types';
import { mockGlobalState } from '../../../../public/common/mock';
import type { EntityDefinition } from '@kbn/entities-schema';
import { convertToEntityManagerDefinition } from './entity_definitions/entity_manager_conversion';
import { EntityType } from '../../../../common/search_strategy';
import type {
  EngineDescriptor,
  InitEntityEngineResponse,
} from '../../../../common/api/entity_analytics';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { defaultOptions } from './constants';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createStubDataView } from '@kbn/data-views-plugin/common/mocks';

const definition: EntityDefinition = convertToEntityManagerDefinition(
  {
    id: 'host_engine',
    entityType: 'host',
    pipeline: [],
    version: '0.0.1',
    fields: [],
    identityField: 'host.name',
    identityFieldMapping: { type: 'keyword' },
    indexMappings: {},
    indexPatterns: [],
    settings: {
      timeout: '180s',
      docsPerSecond: undefined,
      syncDelay: '1m',
      frequency: '1m',
      timestampField: '@timestamp',
      lookbackPeriod: '24h',
    },
    dynamic: false,
  },
  { namespace: 'test', filter: '' }
);

const engine: EngineDescriptor = {
  type: 'user',
  frequency: '',
  fieldHistoryLength: 0,
  indexPattern: '',
  lookbackPeriod: '',
  timeout: '',
  delay: '',
  status: 'started',
};

const stubSecurityDataView = createStubDataView({
  spec: {
    id: 'security',
    title: 'security',
  },
});

const defaultIndexPatterns = [
  stubSecurityDataView.getIndexPattern(),
  '.asset-criticality.asset-criticality-default',
  'risk-score.risk-score-latest-default',
];

const dataviewService = {
  ...dataViewPluginMocks.createStartContract(),
  get: () => Promise.resolve(stubSecurityDataView),
  clearInstanceCache: () => Promise.resolve(),
};

const mockGetEntityDefinition = jest.fn().mockResolvedValue([]);
const mockUpdateEntityDefinition = jest.fn().mockResolvedValue(undefined);
jest.mock('@kbn/entityManager-plugin/server/lib/entity_client', () => {
  return {
    EntityClient: jest.fn().mockImplementation(() => ({
      updateEntityDefinition: mockUpdateEntityDefinition,
      getEntityDefinitions: mockGetEntityDefinition,
    })),
  };
});

const mockListDescriptor = jest.fn().mockResolvedValue({ engines: [] });
const mockUpdateStatus = jest.fn().mockResolvedValue({});
jest.mock('./saved_object/engine_descriptor', () => {
  return {
    EngineDescriptorClient: jest.fn().mockImplementation(() => ({
      list: mockListDescriptor,
      updateStatus: mockUpdateStatus,
    })),
  };
});

const mockCheckPrivileges = jest.fn().mockReturnValue({
  hasAllRequested: true,
  privileges: {
    elasticsearch: { cluster: [], index: [] },
    kibana: [],
  },
});

describe('EntityStoreDataClient', () => {
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const esClientMock = clusterClientMock.asCurrentUser;
  const loggerMock = loggingSystemMock.createLogger();
  const dataClient = new EntityStoreDataClient({
    clusterClient: clusterClientMock,
    logger: loggerMock,
    namespace: 'default',
    soClient: savedObjectsClientMock.create(),
    kibanaVersion: '9.0.0',
    dataViewsService: dataviewService as unknown as DataViewsService,
    appClient: {
      getSourcererDataViewId: jest.fn().mockReturnValue('security-solution'),
      getAlertsIndex: jest.fn().mockReturnValue('alerts'),
    } as unknown as AppClient,
    config: {} as EntityStoreConfig,
    experimentalFeatures: mockGlobalState.app.enableExperimental,
    taskManager: {} as TaskManagerStartContract,
    security: {
      authz: {
        checkPrivilegesDynamicallyWithRequest: () => mockCheckPrivileges,
      },
    } as unknown as SecurityPluginStart,
    request: {} as KibanaRequest,
  });

  const defaultSearchParams = {
    entityTypes: ['host'] as EntityType[],
    page: 1,
    perPage: 10,
    sortField: 'hostName',
    sortOrder: 'asc' as SortOrder,
  };

  const emptySearchResponse = {
    took: 0,
    timed_out: false,
    _shards: {
      total: 0,
      successful: 0,
      skipped: 0,
      failed: 0,
    },
    hits: {
      total: 0,
      hits: [],
    },
  };

  describe('search entities', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      esClientMock.search.mockResolvedValue(emptySearchResponse);
    });

    it('searches in the entities store indices', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        entityTypes: [EntityType.host, EntityType.user],
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index: [
            '.entities.v1.latest.security_host_default',
            '.entities.v1.latest.security_user_default',
          ],
        })
      );
    });

    it('should filter by filterQuery param', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        filterQuery: '{"match_all":{}}',
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ query: { match_all: {} } })
      );
    });

    it('should paginate', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        page: 3,
        perPage: 7,
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ from: 14, size: 7 })
      );
    });

    it('should sort', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        sortField: '@timestamp',
        sortOrder: 'asc',
      });

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ sort: [{ '@timestamp': 'asc' }] })
      );
    });

    it('caps the size to the maximum query size', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        perPage: 999_999,
      });

      const maxSize = 10_000;

      expect(esClientMock.search).toHaveBeenCalledWith(expect.objectContaining({ size: maxSize }));
    });

    it('ignores an index_not_found_exception if the entity index does not exist', async () => {
      await dataClient.searchEntities(defaultSearchParams);

      expect(esClientMock.search).toHaveBeenCalledWith(
        expect.objectContaining({ ignore_unavailable: true })
      );
    });

    it('returns inspect query params', async () => {
      const response = await dataClient.searchEntities(defaultSearchParams);

      expect(response.inspect).toMatchSnapshot();
    });

    it('returns searched entity record', async () => {
      const fakeEntityRecord = { entity_record: true, asset: { criticality: 'low' } };

      esClientMock.search.mockResolvedValue({
        ...emptySearchResponse,
        hits: {
          total: 1,
          hits: [
            {
              _index: '.entities.v1.latest.security_host_default',
              _source: fakeEntityRecord,
            },
          ],
        },
      });

      const response = await dataClient.searchEntities(defaultSearchParams);

      expect(response.records[0]).toEqual(fakeEntityRecord);
    });

    it("returns empty asset criticality when criticality value is 'deleted'", async () => {
      const fakeEntityRecord = { entity_record: true };

      esClientMock.search.mockResolvedValue({
        ...emptySearchResponse,
        hits: {
          total: 1,
          hits: [
            {
              _index: '.entities.v1.latest.security_host_default',
              _source: { asset: { criticality: 'deleted' }, ...fakeEntityRecord },
            },
          ],
        },
      });

      const response = await dataClient.searchEntities(defaultSearchParams);

      expect(response.records[0]).toEqual(fakeEntityRecord);
    });
  });

  describe('getComponentFromEntityDefinition', () => {
    it('returns installed false if no definition is provided', () => {
      const result = dataClient.getComponentFromEntityDefinition('security_host_test', undefined);
      expect(result).toEqual([
        {
          id: 'security_host_test',
          installed: false,
          resource: 'entity_definition',
        },
      ]);
    });

    it('returns correct components for EntityDefinitionWithState', () => {
      const definitionWithState = {
        ...definition,
        state: {
          installed: true,
          running: true,
          components: {
            transforms: [
              {
                id: 'transforms_id',
                installed: true,
                running: true,
              },
            ],
            ingestPipelines: [
              {
                id: 'pipeline-1',
                installed: true,
              },
            ],
            indexTemplates: [
              {
                id: 'indexTemplates_id',
                installed: true,
              },
            ],
          },
        },
      };

      const result = dataClient.getComponentFromEntityDefinition(
        'security_host_test',
        definitionWithState
      );
      expect(result).toEqual([
        {
          id: 'security_host_test',
          installed: true,
          resource: 'entity_definition',
        },
        {
          id: 'security_host_test',
          resource: 'transform',
          installed: true,
          health: 'unknown',
          errors: undefined,
        },
        {
          resource: 'ingest_pipeline',
          id: 'pipeline-1',
          installed: true,
        },
        {
          id: 'indexTemplates_id',
          installed: true,
          resource: 'index_template',
        },
      ]);
    });

    it('returns empty array for EntityDefinition without state', () => {
      const result = dataClient.getComponentFromEntityDefinition('security_host_test', definition);
      expect(result).toEqual([]);
    });

    it('handles transform health issues correctly', () => {
      const definitionWithState = {
        ...definition,
        state: {
          installed: true,
          components: {
            transforms: [
              {
                installed: true,
                stats: {
                  health: {
                    status: 'yellow',
                    issues: [
                      {
                        type: 'issue-type',
                        issue: 'issue-message',
                        details: 'issue-details',
                        count: 1,
                      },
                    ],
                  },
                },
              },
            ],
            ingestPipelines: [],
            indexTemplates: [],
          },
        },
      };

      const result = dataClient.getComponentFromEntityDefinition(
        'security_host_test',
        definitionWithState
      );
      expect(result).toEqual([
        {
          id: 'security_host_test',
          installed: true,
          resource: 'entity_definition',
        },
        {
          id: 'security_host_test',
          resource: 'transform',
          installed: true,
          health: 'yellow',
          errors: [
            {
              title: 'issue-message',
              message: 'issue-details',
            },
          ],
        },
      ]);
    });
  });

  describe('enable entities', () => {
    let spyInit: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();
      spyInit = jest
        .spyOn(dataClient, 'init')
        .mockImplementation(() => Promise.resolve({} as InitEntityEngineResponse));
    });

    it('only enable engine for the given entityType', async () => {
      await dataClient.enable({
        ...defaultOptions,
        entityTypes: [EntityType.host],
      });

      expect(spyInit).toHaveBeenCalledWith(EntityType.host, expect.anything(), expect.anything());
    });
  });

  describe('applyDataViewIndices', () => {
    beforeEach(() => {
      mockUpdateEntityDefinition.mockClear();
      jest.clearAllMocks();
    });

    it('applies data view indices to the entity store', async () => {
      mockListDescriptor.mockResolvedValueOnce({ engines: [engine] });
      mockGetEntityDefinition.mockResolvedValueOnce({
        definitions: [definition],
      });

      const response = await dataClient.applyDataViewIndices();

      expect(mockUpdateEntityDefinition).toHaveBeenCalled();
      expect(response.errors.length).toBe(0);
      expect(response.successes.length).toBe(1);
    });

    it('adds the engine indexPattern to the the entity store', async () => {
      const indexPattern = 'testIndex';
      mockListDescriptor.mockResolvedValueOnce({
        engines: [{ ...engine, indexPattern }],
      });
      mockGetEntityDefinition.mockResolvedValueOnce({
        definitions: [definition],
      });

      const response = await dataClient.applyDataViewIndices();

      expect(mockUpdateEntityDefinition).toHaveBeenCalled();
      expect(response.errors.length).toBe(0);
      expect(response.successes.length).toBe(1);
      expect(response.successes[0].changes).toEqual({
        indexPatterns: [...defaultIndexPatterns, 'testIndex'],
      });
    });

    it('returns empty successes and errors if no engines found', async () => {
      mockListDescriptor.mockResolvedValueOnce({ engines: [] });

      const response = await dataClient.applyDataViewIndices();

      expect(response.successes.length).toBe(0);
      expect(response.errors.length).toBe(0);
    });

    it('return an error if the user does not have required privileges', async () => {
      mockCheckPrivileges.mockReturnValueOnce({
        hasAllRequested: false,
        privileges: {
          elasticsearch: { cluster: [], index: [] },
          kibana: [],
        },
      });
      mockListDescriptor.mockResolvedValueOnce({
        engines: [engine],
      });
      mockGetEntityDefinition.mockResolvedValueOnce({
        definitions: [definition],
      });

      const result = await dataClient.applyDataViewIndices();

      await expect(result.errors.length).toBe(1);
      await expect(result.errors[0].message).toMatch(
        /The current user does not have the required indices privileges.*/
      );
    });

    it('skips update if index patterns are the same', async () => {
      mockListDescriptor.mockResolvedValueOnce({ engines: [engine] });
      mockGetEntityDefinition.mockResolvedValueOnce({
        definitions: [
          {
            indexPatterns: defaultIndexPatterns,
          },
        ],
      });

      const response = await dataClient.applyDataViewIndices();

      expect(mockUpdateEntityDefinition).not.toHaveBeenCalled();
      expect(response.successes.length).toBe(1);
      expect(response.errors.length).toBe(0);
    });

    it('handles errors during update', async () => {
      const testErrorMessages = 'Update failed';
      mockUpdateEntityDefinition.mockRejectedValueOnce(new Error(testErrorMessages));
      mockListDescriptor.mockResolvedValueOnce({ engines: [engine] });
      mockGetEntityDefinition.mockResolvedValueOnce({
        definitions: [definition],
      });

      const response = await dataClient.applyDataViewIndices();

      expect(response.errors.length).toBeGreaterThan(0);
      expect(response.errors[0].message).toBe(testErrorMessages);
    });
  });
});
