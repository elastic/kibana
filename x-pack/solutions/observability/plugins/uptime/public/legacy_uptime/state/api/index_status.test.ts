/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { API_URLS } from '../../../../common/constants';
import { fetchIndexStatus } from './index_status';
import { apiService } from './utils';

jest.mock('./utils', () => ({
  apiService: {
    get: jest.fn(),
  },
}));

const apiServiceGet = apiService.get as jest.MockedFunction<typeof apiService.get>;

describe('fetchIndexStatus', () => {
  beforeEach(() => {
    apiServiceGet.mockReset();
  });

  it('de-duplicates concurrent requests for the same range', async () => {
    apiServiceGet.mockResolvedValue({ indexExists: true, indices: 'heartbeat-*' });

    const [first, second] = await Promise.all([
      fetchIndexStatus('now-7d/d', 'now/d'),
      fetchIndexStatus('now-7d/d', 'now/d'),
    ]);

    expect(apiServiceGet).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
  });

  it('does not serve a range-bounded answer to a concurrent unbounded request', async () => {
    apiServiceGet.mockImplementation((_apiUrl, params) =>
      Promise.resolve(
        params?.from
          ? { indexExists: false, indices: 'heartbeat-*' }
          : { indexExists: true, indices: 'heartbeat-*' }
      )
    );

    const [bounded, unbounded] = await Promise.all([
      fetchIndexStatus('now-7d/d', 'now/d'),
      fetchIndexStatus(),
    ]);

    expect(apiServiceGet).toHaveBeenCalledTimes(2);
    expect(bounded).toEqual({ indexExists: false, indices: 'heartbeat-*' });
    expect(unbounded).toEqual({ indexExists: true, indices: 'heartbeat-*' });
  });

  it('re-requests once the previous request for the same range has settled', async () => {
    apiServiceGet.mockRejectedValueOnce(new Error('boom'));
    apiServiceGet.mockResolvedValueOnce({ indexExists: true, indices: 'heartbeat-*' });

    await expect(fetchIndexStatus()).rejects.toThrow('boom');
    await expect(fetchIndexStatus()).resolves.toEqual({
      indexExists: true,
      indices: 'heartbeat-*',
    });
    expect(apiServiceGet).toHaveBeenNthCalledWith(
      1,
      API_URLS.INDEX_STATUS,
      { from: undefined, to: undefined },
      expect.anything()
    );
  });
});
