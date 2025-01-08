/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRangeFilteredIndices } from './get_range_filtered_indices';
import { fetchAvailableIndices } from '../lib/fetch_available_indices';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';

jest.mock('../lib/fetch_available_indices');

const fetchAvailableIndicesMock = fetchAvailableIndices as jest.Mock;

describe('getRangeFilteredIndices', () => {
  let client: jest.Mocked<IScopedClusterClient>;
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    client = {
      asCurrentUser: jest.fn(),
    } as unknown as jest.Mocked<IScopedClusterClient>;

    logger = {
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    jest.clearAllMocks();
  });

  describe('when fetching available indices is successful', () => {
    describe('and there are available indices', () => {
      it('should return the flattened available indices', async () => {
        fetchAvailableIndicesMock.mockResolvedValueOnce(['index1', 'index2']);
        fetchAvailableIndicesMock.mockResolvedValueOnce(['index3']);

        const result = await getRangeFilteredIndices({
          client,
          authorizedIndexNames: ['auth1', 'auth2'],
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          logger,
          pattern: 'pattern*',
        });

        expect(fetchAvailableIndices).toHaveBeenCalledTimes(2);
        expect(result).toEqual(['index1', 'index2', 'index3']);
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    describe('and there are no available indices', () => {
      it('should log a warning and return an empty array', async () => {
        fetchAvailableIndicesMock.mockResolvedValue([]);

        const result = await getRangeFilteredIndices({
          client,
          authorizedIndexNames: ['auth1', 'auth2'],
          startDate: '2023-01-01',
          endDate: '2023-01-31',
          logger,
          pattern: 'pattern*',
        });

        expect(fetchAvailableIndices).toHaveBeenCalledTimes(2);
        expect(result).toEqual([]);
        expect(logger.warn).toHaveBeenCalledWith(
          'No available authorized indices found under pattern: pattern*, in the given date range: 2023-01-01 - 2023-01-31'
        );
      });
    });
  });

  describe('when fetching available indices fails', () => {
    it('should log an error and return an empty array', async () => {
      fetchAvailableIndicesMock.mockRejectedValue(new Error('Fetch error'));

      const result = await getRangeFilteredIndices({
        client,
        authorizedIndexNames: ['auth1'],
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        logger,
        pattern: 'pattern*',
      });

      expect(fetchAvailableIndices).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(logger.error).toHaveBeenCalledWith(
        'Error fetching available indices in the given data range: 2023-01-01 - 2023-01-31'
      );
    });
  });
});
