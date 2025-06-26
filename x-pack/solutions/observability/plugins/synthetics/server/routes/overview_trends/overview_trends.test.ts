/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SyntheticsEsClient } from '../../lib';
import { fetchTrends } from './overview_trends';

const mockEsClient: Partial<SyntheticsEsClient> = {
  msearch: jest.fn(),
};

describe('fetchTrends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correctly formatted trend data with valid input', async () => {
    const configs = {
      config1: { locations: ['location1'], interval: 10 },
    };

    const stats = { avg: 15, min: 10, max: 20, sum: 30, count: 2 };

    const mockResponse = {
      responses: [
        {
          aggregations: {
            byId: {
              buckets: [
                {
                  key: 'config1',
                  byLocation: {
                    buckets: [
                      {
                        key: 'location1',
                        last50: {
                          buckets: [{ max: { value: 10 } }, { max: { value: 20 } }],
                        },
                        stats,
                        median: { values: { '50.0': 18 } },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    };

    (mockEsClient.msearch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await fetchTrends(mockEsClient as SyntheticsEsClient, configs);

    const expectedOutput = {
      config1location1: {
        configId: 'config1',
        locationId: 'location1',
        data: [
          { x: 0, y: 10 },
          { x: 1, y: 20 },
        ],
        ...stats,
        median: 18,
      },
    };

    expect(result).toEqual(expectedOutput);
    expect(mockEsClient.msearch).toHaveBeenCalledTimes(1);
  });

  it('should return an empty object when no responses are returned', async () => {
    const configs = {
      config1: { locations: ['location1'], interval: 10 },
    };

    const mockResponse = {
      responses: [],
    };

    (mockEsClient.msearch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await fetchTrends(mockEsClient as SyntheticsEsClient, configs);

    expect(result).toEqual({});
    expect(mockEsClient.msearch).toHaveBeenCalledTimes(1);
  });

  it('should handle missing aggregations and return an empty object', async () => {
    const configs = {
      config1: { locations: ['location1'], interval: 10 },
    };

    const mockResponse = {
      responses: [
        {
          aggregations: null,
        },
      ],
    };

    (mockEsClient.msearch as jest.Mock).mockResolvedValueOnce(mockResponse);

    const result = await fetchTrends(mockEsClient as SyntheticsEsClient, configs);

    expect(result).toEqual({});
    expect(mockEsClient.msearch).toHaveBeenCalledTimes(1);
  });

  it('should throw an error if msearch fails', async () => {
    const configs = {
      config1: { locations: ['location1'], interval: 10 },
    };

    (mockEsClient.msearch as jest.Mock).mockRejectedValueOnce(new Error('Elasticsearch error'));

    await expect(fetchTrends(mockEsClient as SyntheticsEsClient, configs)).rejects.toThrow(
      'Elasticsearch error'
    );
    expect(mockEsClient.msearch).toHaveBeenCalledTimes(1);
  });
});
