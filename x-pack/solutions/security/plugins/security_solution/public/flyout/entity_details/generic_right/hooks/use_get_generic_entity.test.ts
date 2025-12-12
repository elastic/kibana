/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of } from 'rxjs';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { estypes } from '@elastic/elasticsearch';
import { ASSET_INVENTORY_INDEX_PATTERN } from '../../../../asset_inventory/constants';
import type { GenericEntityRecord } from '../../../../asset_inventory/types/generic_entity_record';
import { fetchGenericEntity } from './use_get_generic_entity';

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

  describe('query building logic with mandatory parameters', () => {
    it('should build bool query with _id term when only entityDocId is provided', async () => {
      const entityDocId = 'test-doc-id';

      await fetchGenericEntity(mockDataService, { entityDocId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            bool: {
              should: [
                {
                  term: {
                    _id: entityDocId,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          fields: ['*'],
        },
      });
    });

    it('should build bool query with entity.id term when only entityId is provided', async () => {
      const entityId = 'test-entity-id';

      await fetchGenericEntity(mockDataService, { entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            bool: {
              should: [
                {
                  term: {
                    'entity.id': entityId,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          fields: ['*'],
        },
      });
    });

    it('should build OR query with both _id and entity.id terms when both are provided', async () => {
      const entityDocId = 'test-doc-id';
      const entityId = 'test-entity-id';

      await fetchGenericEntity(mockDataService, { entityDocId, entityId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            bool: {
              should: [
                {
                  term: {
                    _id: entityDocId,
                  },
                },
                {
                  term: {
                    'entity.id': entityId,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          fields: ['*'],
        },
      });
    });

    it('should handle whitespace-only entityDocId as valid', async () => {
      const entityDocId = '   '; // whitespace only

      await fetchGenericEntity(mockDataService, { entityDocId });

      expect(mockDataService.search.search).toHaveBeenCalledWith({
        params: {
          index: ASSET_INVENTORY_INDEX_PATTERN,
          query: {
            bool: {
              should: [
                {
                  term: {
                    _id: '   ',
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          fields: ['*'],
        },
      });
    });
  });
});
