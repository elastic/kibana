/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  SCHEDULED_REPORT_DELETE_ENDPOINT,
  SCHEDULED_REPORT_RUN_ENDPOINT,
  SCHEDULED_REPORT_SET_ENABLED_ENDPOINT,
  type ScheduledReport,
} from '../../../../common/types/scheduled_reports';
import { useApiClient } from '../../../hooks/use_api_client';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { useScheduledReportActions } from './use_scheduled_report_actions';

jest.mock('../../../hooks/use_api_client');
jest.mock('../../../hooks/use_kibana_services');

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

describe('useScheduledReportActions', () => {
  const fetchMock = jest.fn();
  const addSuccess = jest.fn();
  const addError = jest.fn();
  const onChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useApiClient).mockReturnValue({ fetch: fetchMock } as never);
    jest.mocked(useKibanaServices).mockReturnValue({
      notifications: { toasts: { addSuccess, addError } },
    } as never);
  });

  it('toggles enablement, toasts, and refreshes', async () => {
    fetchMock.mockResolvedValue({ id: REPORT.id, enabled: false });
    const { result } = renderHook(() => useScheduledReportActions('shop', onChange));

    await act(() => result.current.setEnabled(REPORT, false));

    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORT_SET_ENABLED_ENDPOINT, {
      params: { path: { serviceName: 'shop', scheduleId: REPORT.id }, body: { enabled: false } },
    });
    expect(addSuccess).toHaveBeenCalledWith('Disabled Weekly scorecard: shop');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('runs a scheduled report immediately', async () => {
    fetchMock.mockResolvedValue({ executionId: 'exec-1' });
    const { result } = renderHook(() => useScheduledReportActions('shop', onChange));

    await act(() => result.current.run(REPORT));

    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORT_RUN_ENDPOINT, {
      params: { path: { serviceName: 'shop', scheduleId: REPORT.id } },
    });
    expect(addSuccess).toHaveBeenCalledWith('Started Weekly scorecard: shop');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('deletes a scheduled report', async () => {
    fetchMock.mockResolvedValue({ deleted: true });
    const { result } = renderHook(() => useScheduledReportActions('shop', onChange));

    await act(() => result.current.remove(REPORT));

    expect(fetchMock).toHaveBeenCalledWith(SCHEDULED_REPORT_DELETE_ENDPOINT, {
      params: { path: { serviceName: 'shop', scheduleId: REPORT.id } },
    });
    expect(addSuccess).toHaveBeenCalledWith('Deleted Weekly scorecard: shop');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('reports failures in an error toast and still refreshes', async () => {
    const boom = new Error('failed');
    fetchMock.mockRejectedValue(boom);
    const { result } = renderHook(() => useScheduledReportActions('shop', onChange));

    await act(() => result.current.run(REPORT));

    expect(addError).toHaveBeenCalledWith(boom, { title: 'Could not run Weekly scorecard: shop' });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
