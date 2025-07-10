/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import React from 'react';

import { DataQualityProvider } from '../../../../../data_quality_context';
import { mockIlmExplain } from '../../../../../mock/ilm_explain/mock_ilm_explain';
import { ERROR_LOADING_ILM_EXPLAIN } from '../../../../../translations';
import { useIlmExplain } from '.';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { Theme } from '@elastic/charts';

const mockHttpFetch = jest.fn();
const mockReportDataQualityIndexChecked = jest.fn();
const mockReportDataQualityCheckAllClicked = jest.fn();
const mockTelemetryEvents = {
  reportDataQualityIndexChecked: mockReportDataQualityIndexChecked,
  reportDataQualityCheckAllCompleted: mockReportDataQualityCheckAllClicked,
};
const { toasts } = notificationServiceMock.createSetupContract();
const ContextWrapper: React.FC<React.PropsWithChildren<{ isILMAvailable?: boolean }>> = ({
  children,
  isILMAvailable = true,
}) => {
  return (
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
};

const pattern = 'packetbeat-*';

describe('useIlmExplain', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('successful response from the ilm api', () => {
    function setup() {
      mockHttpFetch.mockResolvedValue(mockIlmExplain);
      return renderHook(() => useIlmExplain(pattern), {
        wrapper: ContextWrapper,
      });
    }

    test('it returns the expected ilmExplain map', async () => {
      const { result } = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.ilmExplain).toEqual(mockIlmExplain);
      });
    });

    test('it returns loading: false, because the data has loaded', async () => {
      const { result } = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('it returns a null error, because no errors occurred', async () => {
      const { result } = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('skip ilm api when isILMAvailable is false', () => {
    function setup() {
      mockHttpFetch.mockResolvedValue(mockIlmExplain);
      return renderHook(() => useIlmExplain(pattern), {
        wrapper: (props) => <ContextWrapper {...props} isILMAvailable={false} />,
      });
    }

    test('it returns the expected ilmExplain map', async () => {
      const { result } = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.ilmExplain).toEqual(null);
      });
    });

    test('it returns loading: false, because the request is aborted', async () => {
      const { result } = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('fetch rejects with an error', () => {
    const errorMessage = 'simulated error';
    function setup() {
      mockHttpFetch.mockRejectedValue(new Error(errorMessage));
      return renderHook(() => useIlmExplain(pattern), {
        wrapper: ContextWrapper,
      });
    }

    test('it returns a null ilmExplain, because an error occurred', async () => {
      const { result } = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.ilmExplain).toBeNull();
      });
    });

    test('it returns loading: false, because data loading reached a terminal state', async () => {
      const { result } = setup();

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('it returns the expected error', async () => {
      const { result } = setup();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toEqual(ERROR_LOADING_ILM_EXPLAIN(errorMessage));
      });
    });
  });
});
