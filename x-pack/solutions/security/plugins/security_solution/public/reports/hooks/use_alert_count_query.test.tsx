/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { UseCriticalAlerts } from './use_alert_count_query';
import { useAlertCountQuery } from './use_alert_count_query';
import * as useQueryAlertsModule from '../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';
import { useKibana } from '../../common/lib/kibana';
import {
  alertsMock,
  mockAlertsQuery,
} from '../../detections/containers/detection_engine/alerts/mock';

jest.mock('../../detections/containers/detection_engine/alerts/use_query');
jest.mock('../../common/lib/kibana');

const mockSetQuery = jest.fn();
const mockUseQueryAlerts = useQueryAlertsModule as jest.Mocked<typeof useQueryAlertsModule>;

const defaultArgs: UseCriticalAlerts = {
  from: 'now-15m',
  to: 'now',
  signalIndexName: 'test-signal-index',
  queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE,
};

describe('useAlertCountQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { uiSettings: {} },
    });
    mockUseQueryAlerts.useQueryAlerts.mockReturnValue({
      loading: false,
      refetch: jest.fn(),
      data: alertsMock,
      response: JSON.stringify(alertsMock, null, 2),
      request: JSON.stringify({ index: [''], body: mockAlertsQuery }, null, 2),
      setQuery: mockSetQuery,
    });
  });

  it('returns alertCount and isLoading from useQueryAlerts', () => {
    const { result } = renderHook(() => useAlertCountQuery(defaultArgs));
    expect(result.current.alertCount).toBe(10000);
    expect(result.current.isLoading).toBe(false);
  });

  it('returns 0 alertCount if data is undefined', () => {
    mockUseQueryAlerts.useQueryAlerts.mockReturnValue({
      // @ts-ignore
      data: undefined,
      loading: true,
      setQuery: mockSetQuery,
    });

    const { result } = renderHook(() => useAlertCountQuery(defaultArgs));
    expect(result.current.alertCount).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it('calls useQueryAlerts with correct params', () => {
    renderHook(() => useAlertCountQuery(defaultArgs));
    expect(mockUseQueryAlerts.useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        indexName: defaultArgs.signalIndexName,
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE,
      })
    );
  });

  it('returns queryName total compare to useQueryAlerts', () => {
    renderHook(() =>
      useAlertCountQuery({
        ...defaultArgs,
        queryName: ALERTS_QUERY_NAMES.COUNT_AI_VALUE_TOTAL_COMPARE,
      })
    );
    expect(mockUseQueryAlerts.useQueryAlerts).toHaveBeenCalledWith(
      expect.objectContaining({
        queryName: 'securitySolutionUI aiValue total compare',
      })
    );
  });

  it('calls setQuery on effect', () => {
    renderHook(() => useAlertCountQuery(defaultArgs));
    expect(mockSetQuery).toHaveBeenCalled();
  });
});
