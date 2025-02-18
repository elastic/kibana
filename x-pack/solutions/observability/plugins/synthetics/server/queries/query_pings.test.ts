/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryPings } from './query_pings';
import { SyntheticsEsClient } from '../lib';

jest.mock('../lib'); // Mock the ES client module

const mockEsClient: Partial<SyntheticsEsClient> = {
  search: jest.fn(),
};

describe('queryPings', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset mocks before each test
  });

  it.each([10, undefined])(
    'should return the correct result when fields are provided',
    async (sizeParam) => {
      const params = {
        syntheticsEsClient: mockEsClient as SyntheticsEsClient,
        dateRange: { from: '2023-01-01', to: '2023-01-02' },
        index: 0,
        monitorId: 'test-monitor',
        status: 'up',
        sort: 'desc',
        size: sizeParam,
        pageIndex: 0,
        fields: [{ field: 'monitor.id' }],
        fieldsExtractorFn: (doc: any) => ({ fieldData: doc._source }),
      };

      const mockResponse = {
        body: {
          hits: {
            hits: [{ _source: { 'monitor.id': 'test-monitor' } }],
            total: { value: 1 },
          },
        },
      };

      (mockEsClient.search as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await queryPings(params);
      expect(result).toEqual({
        total: 1,
        pings: [{ fieldData: { 'monitor.id': 'test-monitor' } }],
      });

      expect(mockEsClient.search).toHaveBeenCalledTimes(1);
      const searchParams = (mockEsClient.search as jest.Mock).mock.calls[0][0];
      expect(searchParams.body.size).toEqual(sizeParam ?? 25);
    }
  );

  it('should return the correct result when no fields are provided', async () => {
    const params = {
      syntheticsEsClient: mockEsClient as SyntheticsEsClient,
      dateRange: { from: '2023-01-01', to: '2023-01-02' },
      index: 0,
      monitorId: 'test-monitor',
      status: 'up',
      sort: 'desc',
      size: 10,
      pageIndex: 0,
    };

    const mockResponse = {
      body: {
        hits: {
          hits: [{ _source: { '@timestamp': '2023-01-01T00:00:00Z' }, _id: 'doc1' }],
          total: { value: 1 },
        },
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await queryPings(params);
    expect(result).toEqual({
      total: 1,
      pings: [
        { '@timestamp': '2023-01-01T00:00:00Z', docId: 'doc1', timestamp: '2023-01-01T00:00:00Z' },
      ],
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });

  it('should handle excluded locations in the query', async () => {
    const params = {
      syntheticsEsClient: mockEsClient as SyntheticsEsClient,
      dateRange: { from: '2023-01-01', to: '2023-01-02' },
      excludedLocations: JSON.stringify(['excluded-location']),
      size: 10,
      pageIndex: 0,
    };

    const mockResponse = {
      body: {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await queryPings(params);

    expect(result).toEqual({
      total: 0,
      pings: [],
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });

  it('should return an empty result when Elasticsearch returns no hits', async () => {
    const params = {
      syntheticsEsClient: mockEsClient as SyntheticsEsClient,
      dateRange: { from: '2023-01-01', to: '2023-01-02' },
      size: 10,
      pageIndex: 0,
    };

    const mockResponse = {
      body: {
        hits: {
          hits: [],
          total: { value: 0 },
        },
      },
    };

    (mockEsClient.search as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await queryPings(params);
    expect(result).toEqual({
      total: 0,
      pings: [],
    });

    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if query fails to execute', async () => {
    const params = {
      syntheticsEsClient: mockEsClient as SyntheticsEsClient,
      dateRange: { from: '2023-01-01', to: '2023-01-02' },
      size: 10,
      pageIndex: 0,
    };

    (mockEsClient.search as jest.Mock).mockRejectedValueOnce(new Error('Query failed'));

    await expect(queryPings(params)).rejects.toThrow('Query failed');
    expect(mockEsClient.search).toHaveBeenCalledTimes(1);
  });
});
