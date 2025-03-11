/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import React, { FC, PropsWithChildren } from 'react';

import { DataQualityProvider } from '../../../../../data_quality_context';
import { ERROR_LOADING_STATS } from '../../../../../translations';
import { useStats } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { Theme } from '@elastic/charts';
import { mockStatsAuditbeatIndex } from '../../../../../mock/stats/mock_stats_auditbeat_index';

const mockHttpFetch = jest.fn();
const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
const { toasts } = notificationServiceMock.createSetupContract();

const ContextWrapper: FC<PropsWithChildren<{ isILMAvailable?: boolean }>> = ({
  children,
  isILMAvailable = true,
}) => (
  <DataQualityProvider
    httpFetch={mockHttpFetch}
    telemetryEvents={mockTelemetryEvents}
    isILMAvailable={isILMAvailable}
    toasts={toasts}
    addSuccessToast={jest.fn()}
    canUserCreateAndReadCases={jest.fn(() => true)}
    endDate={null}
    formatBytes={jest.fn()}
    formatNumber={jest.fn()}
    isAssistantEnabled={true}
    lastChecked={'2023-03-28T22:27:28.159Z'}
    openCreateCaseFlyout={jest.fn()}
    patterns={['auditbeat-*']}
    setLastChecked={jest.fn()}
    startDate={null}
    theme={{
      background: {
        color: '#000',
      },
    }}
    baseTheme={
      {
        background: {
          color: '#000',
        },
      } as Theme
    }
    ilmPhases={['hot', 'warm', 'unmanaged']}
    selectedIlmPhaseOptions={[
      {
        label: 'Hot',
        value: 'hot',
      },
      {
        label: 'Warm',
        value: 'warm',
      },
      {
        label: 'Unmanaged',
        value: 'unmanaged',
      },
    ]}
    setSelectedIlmPhaseOptions={jest.fn()}
    defaultStartTime={'now-7d'}
    defaultEndTime={'now'}
  >
    {children}
  </DataQualityProvider>
);

const pattern = 'auditbeat-*';
const startDate = `now-7d`;
const endDate = `now`;
const params = {
  pattern,
};

describe('useStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('query with date range when ILM is not available', () => {
    test('it calls the stats api with the expected params', async () => {
      mockHttpFetch.mockResolvedValue(mockStatsAuditbeatIndex);

      const queryParams = {
        isILMAvailable: false,
        startDate,
        endDate,
      };

      renderHook(() => useStats({ pattern, startDate, endDate }), {
        wrapper: ({ children }) => (
          <ContextWrapper isILMAvailable={false}>{children}</ContextWrapper>
        ),
      });

      await waitFor(() => {
        expect(mockHttpFetch.mock.calls[0][1].query).toEqual(queryParams);
      });
    });
  });

  describe('successful response from the stats api', () => {
    function setup() {
      mockHttpFetch.mockResolvedValue(mockStatsAuditbeatIndex);
      const { result } = renderHook(() => useStats(params), {
        wrapper: ContextWrapper,
      });

      return result;
    }

    test('it returns the expected stats', async () => {
      const result = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.stats).toEqual(mockStatsAuditbeatIndex);
      });
    });

    test('it returns loading: false, because the data has loaded', async () => {
      const result = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('it returns a null error, because no errors occurred', async () => {
      const result = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    test('it calls the stats api with the expected params', async () => {
      setup();
      await waitFor(() => {
        expect(mockHttpFetch.mock.calls[0][1].query).toEqual({ isILMAvailable: true });
      });
    });
  });

  describe('fetch rejects with an error', () => {
    const errorMessage = 'simulated error';

    function setup() {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useStats(params), {
        wrapper: ContextWrapper,
      });

      return result;
    }

    test('it returns null stats, because an error occurred', async () => {
      const result = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.stats).toBeNull();
      });
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      const result = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('it returns the expected error', async () => {
      const result = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toEqual(ERROR_LOADING_STATS(errorMessage));
      });
    });
  });
});
