/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';
import { fetchOverviewTrendStats } from './api';

jest.mock('../../../../utils/api_service', () => ({
  apiService: { post: jest.fn() },
}));

describe('fetchOverviewTrendStats', () => {
  const mockPost = apiService.post as jest.Mock;

  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({});
  });

  it('forwards the cancellation signal', async () => {
    const signal = new AbortController().signal;
    const monitors = [{ configId: 'monitor-1', locationIds: ['location-1'], schedule: '3' }];

    await fetchOverviewTrendStats(monitors, signal);

    expect(mockPost).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.OVERVIEW_TRENDS,
      monitors,
      undefined,
      {},
      { signal }
    );
  });
});
