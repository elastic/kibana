/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { CleanUpTempSummary } from './clean_up_temp_summary';

const commonEsResponse = {
  took: 100,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    hits: [],
  },
};

describe('CleanUpTempSummary', () => {
  let esClientMock: ElasticsearchClientMock;
  let service: CleanUpTempSummary;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-02-10T15:00:00.000Z'));
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    service = new CleanUpTempSummary(
      esClientMock,
      loggingSystemMock.createLogger(),
      new AbortController()
    );
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns early if there is no temporary documents', async () => {
    esClientMock.count.mockResolvedValueOnce({
      count: 0,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
    });

    await service.execute();

    expect(esClientMock.search).not.toHaveBeenCalled();
    expect(esClientMock.deleteByQuery).not.toHaveBeenCalled();
  });

  it("deletes nothing when there isn't a duplicate temporary documents", async () => {
    esClientMock.search.mockResolvedValueOnce({
      ...commonEsResponse,
      aggregations: { duplicate_ids: { buckets: [] } },
    });

    await service.execute();

    expect(esClientMock.deleteByQuery).not.toHaveBeenCalled();
    expect(esClientMock.search).toHaveBeenCalledTimes(1);
  });

  it('deletes the duplicated temp documents', async () => {
    // first search returns 1 duplicate and an indication for a next search
    esClientMock.search.mockResolvedValueOnce({
      ...commonEsResponse,
      aggregations: {
        duplicate_ids: {
          after_key: {
            spaceId: 'space-two',
            id: 'last-id',
          },
          buckets: [
            {
              key: {
                spaceId: 'space-one',
                id: 'slo-id-one',
              },
            },
          ],
        },
      },
    });

    // second search returns 1 duplicate and an indication for a next search
    esClientMock.search.mockResolvedValueOnce({
      ...commonEsResponse,
      aggregations: {
        duplicate_ids: {
          after_key: {
            spaceId: 'space-three',
            id: 'last-id-2',
          },
          buckets: [
            {
              key: {
                spaceId: 'space-two',
                id: 'another-temp-id',
              },
            },
          ],
        },
      },
    });

    // third search returns no duplicate and no more next page
    esClientMock.search.mockResolvedValueOnce({
      ...commonEsResponse,
      aggregations: {
        duplicate_ids: {
          buckets: [],
        },
      },
    });

    await service.execute();

    expect(esClientMock.deleteByQuery).toHaveBeenCalledTimes(2);
    expect(esClientMock.deleteByQuery).toMatchSnapshot();
    expect(esClientMock.search).toHaveBeenCalledTimes(3);
  });
});
