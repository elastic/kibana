/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import '@kbn/react-query/mock';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { useGetScheduleExecutionLogs } from '.';
import { ERROR_RETRIEVING_SCHEDULE_EXECUTION_LOGS } from './translations';

const mockAddError = jest.fn();

jest.mock('../../../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: () => ({
    addError: mockAddError,
    addSuccess: jest.fn(),
    addWarning: jest.fn(),
    addInfo: jest.fn(),
    remove: jest.fn(),
  }),
}));

const mockHttp: HttpSetup = {
  get: jest.fn(),
} as unknown as HttpSetup;

let queryClient: QueryClient;
const defaultProps = {
  http: mockHttp,
  isAssistantEnabled: true,
  ruleId: 'rule-1',
};

function wrapper(props: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: queryClient }, props.children);
}

describe('useGetScheduleExecutionLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('requests the rule execution log for the provided ruleId', async () => {
    (mockHttp.get as jest.Mock).mockResolvedValueOnce({ data: [], total: 0 });

    renderHook(() => useGetScheduleExecutionLogs({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(mockHttp.get).toHaveBeenCalledWith(
        '/internal/alerting/rule/rule-1/_execution_log',
        expect.objectContaining({ query: expect.objectContaining({ page: 1 }) })
      );
    });
  });

  it('returns the execution log data when the request succeeds', async () => {
    const mockData = [{ id: 'exec-1', status: 'failure', timestamp: '2026-04-07T12:00:00.000Z' }];
    (mockHttp.get as jest.Mock).mockResolvedValueOnce({ data: mockData, total: 1 });

    const { result } = renderHook(() => useGetScheduleExecutionLogs({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData);
    });
  });

  it('calls addError with the expected title on failure', async () => {
    const error = { body: { message: 'Server error message' } };
    (mockHttp.get as jest.Mock).mockRejectedValueOnce(error);

    renderHook(() => useGetScheduleExecutionLogs({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      const callArgs = mockAddError.mock.calls[0];
      expect(callArgs[1]?.title).toBe(ERROR_RETRIEVING_SCHEDULE_EXECUTION_LOGS);
    });
  });

  it('returns an error when a server error body is present', async () => {
    const error = { body: { message: 'Server error message' } };
    (mockHttp.get as jest.Mock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useGetScheduleExecutionLogs({ ...defaultProps }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
