/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import {
  SCHEDULED_REPORTS_LIST_ENDPOINT,
  type ScheduledReport,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';
import { useScheduledReports } from './use_scheduled_reports';

jest.mock('../../../hooks/use_api_client');

const REPORT: ScheduledReport = {
  id: 'system-digital-experience-scorecard-report-1',
  reportType: 'scorecard',
  serviceName: 'shop',
  name: 'Weekly scorecard: shop',
  lookbackDays: 7,
  schedule: { frequency: 'WEEKLY', weekday: 'MO', hour: 9, minute: 0, timeZone: 'UTC' },
  connectorId: 'email-1',
  recipients: ['team@example.com'],
  enabled: true,
};

describe('useScheduledReports', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useApiClient).mockReturnValue({ fetch: fetchMock } as never);
  });

  it('loads the scheduled reports for an application', async () => {
    fetchMock.mockResolvedValue({ available: true, reports: [REPORT] });

    const { result } = renderHook(() => useScheduledReports('shop'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORTS_LIST_ENDPOINT, {
      signal: expect.any(AbortSignal),
      params: { path: { serviceName: 'shop' } },
    });
    expect(result.current.available).toBe(true);
    expect(result.current.reports).toEqual([REPORT]);
  });

  it('surfaces availability as false when Workflows is unavailable', async () => {
    fetchMock.mockResolvedValue({ available: false, reports: [] });

    const { result } = renderHook(() => useScheduledReports('shop'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.available).toBe(false);
    expect(result.current.reports).toEqual([]);
  });

  it('surfaces errors from the route', async () => {
    fetchMock.mockRejectedValue(new Error('network failed'));

    const { result } = renderHook(() => useScheduledReports('shop'));

    await waitFor(() => expect(result.current.error?.message).toBe('network failed'));
  });
});
