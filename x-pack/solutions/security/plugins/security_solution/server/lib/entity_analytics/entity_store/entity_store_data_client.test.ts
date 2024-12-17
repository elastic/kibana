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
import type { EntityType } from '../../../../common/api/entity_analytics/entity_store/common.gen';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { AppClient } from '../../..';
import type { EntityStoreConfig } from './types';
import { mockGlobalState } from '../../../../public/common/mock';

describe('EntityStoreDataClient', () => {
  const mockSavedObjectClient = savedObjectsClientMock.create();
  const clusterClientMock = elasticsearchServiceMock.createScopedClusterClient();
  const esClientMock = clusterClientMock.asCurrentUser;
  const loggerMock = loggingSystemMock.createLogger();
  const dataClient = new EntityStoreDataClient({
    clusterClient: clusterClientMock,
    logger: loggerMock,
    namespace: 'default',
    soClient: mockSavedObjectClient,
    kibanaVersion: '9.0.0',
    dataViewsService: {} as DataViewsService,
    appClient: {} as AppClient,
    config: {} as EntityStoreConfig,
    experimentalFeatures: mockGlobalState.app.enableExperimental,
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
      jest.resetAllMocks();
      esClientMock.search.mockResolvedValue(emptySearchResponse);
    });

    it('searches in the entities store indices', async () => {
      await dataClient.searchEntities({
        ...defaultSearchParams,
        entityTypes: ['host', 'user'],
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
});
