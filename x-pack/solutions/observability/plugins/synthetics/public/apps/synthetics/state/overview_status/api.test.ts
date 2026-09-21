/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchOverviewStatus, fetchStaleStatus } from './api';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { apiService } from '../../../../utils/api_service';

jest.mock('../../../../utils/api_service', () => ({
  apiService: { get: jest.fn(), post: jest.fn() },
}));

describe('overview status APIs', () => {
  const mockGet = apiService.get as jest.Mock;
  const mockPost = apiService.post as jest.Mock;

  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
    mockGet.mockResolvedValue({});
    mockPost.mockResolvedValue({ priorRuns: [] });
  });

  const pageState = {
    dateRangeStart: 'now-24h',
    dateRangeEnd: 'now',
    query: '',
    tags: [],
    locations: [],
    projects: [],
    schedules: [],
    monitorTypes: [],
    remoteNames: [],
    monitorQueryIds: ['from-page-state'],
    showFromAllSpaces: false,
    useLogicalAndFor: [],
  } as any;

  it('forwards the cancellation signal for an overview request', async () => {
    const signal = new AbortController().signal;

    await fetchOverviewStatus({ pageState }, signal);

    expect(mockGet).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.OVERVIEW_STATUS,
      expect.anything(),
      expect.anything(),
      { signal }
    );
  });

  it('sends monitorQueryIds in the request body', async () => {
    await fetchStaleStatus({
      pageState,
      monitorQueryIds: ['mon-1', 'mon-2'],
    });

    expect(mockPost).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.OVERVIEW_STATUS_STALE,
      { monitorQueryIds: ['mon-1', 'mon-2'] },
      expect.anything(),
      expect.objectContaining({
        dateRangeStart: 'now-24h',
        dateRangeEnd: 'now',
      })
    );
  });

  it('forwards the cancellation signal for a stale-status request', async () => {
    const signal = new AbortController().signal;

    await fetchStaleStatus({ pageState, monitorQueryIds: ['mon-1'] }, signal);

    expect(mockPost).toHaveBeenCalledWith(
      SYNTHETICS_API_URLS.OVERVIEW_STATUS_STALE,
      { monitorQueryIds: ['mon-1'] },
      expect.anything(),
      expect.anything(),
      { signal }
    );
  });
});
