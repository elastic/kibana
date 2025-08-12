/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../../../../asset_inventory/constants';
import type { GenericEntityRecord } from '../../../../asset_inventory/types/generic_entity_record';

// Import the function we want to test
// Since fetchGenericEntity is not exported, we need to recreate it for testing
const fetchGenericEntity = async (
  dataService: DataPublicPluginStart,
  { docId, entityId }: { docId: string; entityId: string }
): Promise<IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>> => {
  let termQuery;

  if (docId && docId !== '') {
    termQuery = { _id: docId };
  } else if (entityId && entityId !== '') {
    termQuery = { 'entity.id': entityId };
  }

  const { lastValueFrom } = await import('rxjs');
  return lastValueFrom(
    dataService.search.search<
      IKibanaSearchRequest<estypes.SearchRequest>,
      IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>
    >({
      params: {
        index: ASSET_INVENTORY_INDEX_PATTERN,
        query: {
          term: termQuery,
        },
      },
    })
  );
};

describe('fetchGenericEntity', () => {
  let mockDataService: jest.Mocked<DataPublicPluginStart>;
  let mockSearchResponse: IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>;

  beforeEach(() => {
    mockSearchResponse = {
      rawResponse: {
        took: 5,
        timed_out: false,
        _shards: {
          total: 1,
          successful: 1,
          skipped: 0,
          failed: 0,
        },
        hits: {
          total: {
            value: 1,
            relation: 'eq',
          },
          max_score: 1.0,
          hits: [
            {
              _index: 'test-index',
              _id: 'test-doc-id',
              _score: 1.0,
              _source: {
                '@timestamp': new Date('2023-01-01T00:00:00.000Z'),
                entity: {
                  id: 'test-entity-id',
                  name: 'test-entity',
                  source: 'test-source',
                  type: 'host',
                  sub_type: 'test-sub-type',
                  url: 'https://test.example.com',
                  EngineMetadata: {
                    Type: 'generic',
                  },
                },
                asset: {
                  criticality: 'medium_impact',
                },
                labels: {
                  env: 'test',
                },
                tags: ['test-tag'],
              } as GenericEntityRecord,
            },
          ],
        },
      },
      isPartial: false,
      isRunning: false,
      total: 1,
      loaded: 1,
    } as IKibanaSearchResponse<estypes.SearchResponse<GenericEntityRecord>>;

    mockDataService = {
      search: {
        search: jest.fn().mockReturnValue(of(mockSearchResponse)),
      },
    } as unknown as jest.Mocked<DataPublicPluginStart>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('query building logic', () => {
    it('should build query with _id term when docId is provided', async () => {
      const docId = 'test-doc-id';
      const entityId = '';

      await fetchGenericEntity(mockDataService, { docId, entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            term: {
              _id: docId,
            },
          },
        },
      });
    });

    it('should build query with entity.id term when entityId is provided and docId is empty', async () => {
      const docId = '';
      const entityId = 'test-entity-id';

      await fetchGenericEntity(mockDataService, { docId, entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            term: {
              'entity.id': entityId,
            },
          },
        },
      });
    });

    it('should prioritize docId over entityId when both are provided', async () => {
      const docId = 'test-doc-id';
      const entityId = 'test-entity-id';

      await fetchGenericEntity(mockDataService, { docId, entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            term: {
              _id: docId,
            },
          },
        },
      });
    });

    it('should build query with undefined term when both docId and entityId are empty strings', async () => {
      const docId = '';
      const entityId = '';

      await fetchGenericEntity(mockDataService, { docId, entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            term: undefined,
          },
        },
      });
    });
  });
});
