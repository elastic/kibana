/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import moment from 'moment-timezone';

import type {
  FetchAvailableCatIndicesResponseRequired,
  IndexSearchAggregationResponse,
} from './fetch_available_indices';
import { fetchAvailableIndices } from './fetch_available_indices';

function getEsClientMock() {
  return {
    search: jest.fn().mockResolvedValue({
      aggregations: {
        index: {
          buckets: [],
        },
      },
    }),
    cat: {
      indices: jest.fn().mockResolvedValue([]),
    },
  } as unknown as ElasticsearchClient & {
    cat: {
      indices: jest.Mock<Promise<FetchAvailableCatIndicesResponseRequired>>;
    };
    search: jest.Mock<Promise<{ aggregations: IndexSearchAggregationResponse }>>;
  };
}

// fixing timezone for both Date and moment
// so when tests are run in different timezones, the results are consistent
process.env.TZ = 'UTC';
moment.tz.setDefault('UTC');

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

// We assume that the dates are in UTC, because es is using UTC
// It also diminishes difference date parsing by Date and moment constructors
// in different timezones, i.e. short ISO format '2021-10-01' is parsed as local
// date by moment and as UTC date by Date, whereas long ISO format '2021-10-01T00:00:00Z'
// is parsed as UTC date by both
const startDateString: string = '2021-10-01T00:00:00Z';
const endDateString: string = '2021-10-07T00:00:00Z';

const startDateMillis: number = new Date(startDateString).getTime();
const endDateMillis: number = new Date(endDateString).getTime();

describe('fetchAvailableIndices', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('aggregate search given index by startDate and endDate', async () => {
    const esClientMock = getEsClientMock();

    await fetchAvailableIndices(esClientMock, {
      indexNameOrPattern: 'logs-*',
      startDate: startDateString,
      endDate: endDateString,
    });

    expect(esClientMock.search).toHaveBeenCalledWith({
      query: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  format: 'strict_date_optional_time',
                  gte: startDateString,
                  lte: endDateString,
                },
              },
            },
          ],
          must: [],
          must_not: [],
          should: [],
        },
      },
      index: 'logs-*',
      size: 0,
      aggs: {
        index: {
          terms: {
            field: '_index',
          },
        },
      },
    });
  });

  it('should call esClient.cat.indices for given index', async () => {
    const esClientMock = getEsClientMock();

    await fetchAvailableIndices(esClientMock, {
      indexNameOrPattern: 'logs-*',
      startDate: startDateString,
      endDate: endDateString,
    });

    expect(esClientMock.cat.indices).toHaveBeenCalledWith({
      index: 'logs-*',
      format: 'json',
      h: 'index,creation.date',
    });
  });

  describe('when indices are created within the date range', () => {
    it('returns indices within the date range', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.10.01',
          'creation.date': `${startDateMillis}`,
        },
        {
          index: 'logs-2021.10.05',
          'creation.date': `${startDateMillis + 4 * DAY_IN_MILLIS}`,
        },
        {
          index: 'logs-2021.09.30',
          'creation.date': `${startDateMillis - DAY_IN_MILLIS}`,
        },
      ]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual(['logs-2021.10.01', 'logs-2021.10.05']);

      expect(esClientMock.cat.indices).toHaveBeenCalledWith({
        index: 'logs-*',
        format: 'json',
        h: 'index,creation.date',
      });
    });
  });

  describe('when indices are outside the date range', () => {
    it('returns an empty list', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.09.30',
          'creation.date': `${startDateMillis - DAY_IN_MILLIS}`,
        },
        {
          index: 'logs-2021.10.08',
          'creation.date': `${endDateMillis + DAY_IN_MILLIS}`,
        },
      ]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual([]);
    });
  });

  describe('when no indices match the index pattern', () => {
    it('returns empty list', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'nonexistent-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual([]);
    });
  });

  describe('when indices have data in the date range', () => {
    it('returns indices with data in the date range', async () => {
      const esClientMock = getEsClientMock();

      // esClient.cat.indices returns no indices
      esClientMock.cat.indices.mockResolvedValue([]);

      // esClient.search returns indices with data in the date range
      esClientMock.search.mockResolvedValue({
        aggregations: {
          index: {
            buckets: [
              { key: 'logs-2021.10.02', doc_count: 100 },
              { key: 'logs-2021.10.03', doc_count: 150 },
            ],
          },
        },
      });

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual(['logs-2021.10.02', 'logs-2021.10.03']);
    });

    it('combines indices from both methods without duplicates', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.10.01',
          'creation.date': `${startDateMillis}`,
        },
        {
          index: 'logs-2021.10.03',
          'creation.date': `${startDateMillis + 2 * DAY_IN_MILLIS}`,
        },
      ]);

      esClientMock.search.mockResolvedValue({
        aggregations: {
          index: {
            buckets: [
              { key: 'logs-2021.10.03', doc_count: 150 },
              { key: 'logs-2021.10.04', doc_count: 200 },
            ],
          },
        },
      });

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual(['logs-2021.10.01', 'logs-2021.10.03', 'logs-2021.10.04']);
    });
  });

  describe('edge cases for creation dates', () => {
    it('includes indices with creation date exactly at startDate and endDate', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.10.01',
          'creation.date': `${startDateMillis}`,
        },
        {
          index: 'logs-2021.10.07',
          'creation.date': `${endDateMillis}`,
        },
      ]);

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual(['logs-2021.10.01', 'logs-2021.10.07']);
    });
  });

  describe('when esClient.search rejects', () => {
    it('throws an error', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.search.mockRejectedValue(new Error('Elasticsearch search error'));

      await expect(
        fetchAvailableIndices(esClientMock, {
          indexNameOrPattern: 'logs-*',
          startDate: startDateString,
          endDate: endDateString,
        })
      ).rejects.toThrow('Elasticsearch search error');
    });
  });

  describe('when both esClient.cat.indices and esClient.search return empty', () => {
    it('returns an empty list', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([]);
      esClientMock.search.mockResolvedValue({
        aggregations: {
          index: {
            buckets: [],
          },
        },
      });

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual([]);
    });
  });

  describe('when indices are returned with both methods and have duplicates', () => {
    it('does not duplicate indices in the result', async () => {
      const esClientMock = getEsClientMock();

      esClientMock.cat.indices.mockResolvedValue([
        {
          index: 'logs-2021.10.05',
          'creation.date': `${startDateMillis + 4 * DAY_IN_MILLIS}`,
        },
      ]);

      esClientMock.search.mockResolvedValue({
        aggregations: {
          index: {
            buckets: [{ key: 'logs-2021.10.05', doc_count: 100 }],
          },
        },
      });

      const result = await fetchAvailableIndices(esClientMock, {
        indexNameOrPattern: 'logs-*',
        startDate: startDateString,
        endDate: endDateString,
      });

      expect(result).toEqual(['logs-2021.10.05']);
    });
  });

  describe('given keyword dates', () => {
    describe('given 7 days range', () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2021-10-07T00:00:00Z').getTime());
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it('finds indices created within the date range', async () => {
        const esClientMock = getEsClientMock();

        esClientMock.cat.indices.mockResolvedValue([
          {
            index: 'logs-2021.10.01',
            'creation.date': `${startDateMillis}`,
          },
          {
            index: 'logs-2021.10.05',
            'creation.date': `${startDateMillis + 4 * DAY_IN_MILLIS}`,
          },
        ]);

        const results = await fetchAvailableIndices(esClientMock, {
          indexNameOrPattern: 'logs-*',
          startDate: 'now-7d/d',
          endDate: 'now/d',
        });

        expect(results).toEqual(['logs-2021.10.01', 'logs-2021.10.05']);
      });

      it('finds indices with end date rounded up to the end of the day', async () => {
        const esClientMock = getEsClientMock();

        esClientMock.cat.indices.mockResolvedValue([
          {
            index: 'logs-2021.10.06',
            'creation.date': `${new Date('2021-10-06T23:59:59Z').getTime()}`,
          },
        ]);

        const results = await fetchAvailableIndices(esClientMock, {
          indexNameOrPattern: 'logs-*',
          startDate: 'now-7d/d',
          endDate: 'now-1d/d',
        });

        expect(results).toEqual(['logs-2021.10.06']);
      });
    });
  });

  describe('rejections', () => {
    beforeEach(() => {
      jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });
    describe('when esClient.cat.indices rejects', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        esClientMock.cat.indices.mockRejectedValue(new Error('Elasticsearch error'));

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexNameOrPattern: 'logs-*',
            startDate: startDateString,
            endDate: endDateString,
          })
        ).rejects.toThrow('Elasticsearch error');
      });
    });

    describe('when startDate is invalid', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexNameOrPattern: 'logs-*',
            startDate: 'invalid-date',
            endDate: endDateString,
          })
        ).rejects.toThrow('Invalid date format: invalid-date');
      });
    });

    describe('when endDate is invalid', () => {
      it('throws an error', async () => {
        const esClientMock = getEsClientMock();

        await expect(
          fetchAvailableIndices(esClientMock, {
            indexNameOrPattern: 'logs-*',
            startDate: startDateString,
            endDate: 'invalid-date',
          })
        ).rejects.toThrow('Invalid date format: invalid-date');
      });
    });
  });
});
