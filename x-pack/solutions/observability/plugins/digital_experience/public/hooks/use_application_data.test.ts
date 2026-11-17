/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ApplicationErrorsResponse } from '../../common/types/errors';
import { useApiClient } from './use_api_client';
import type { ApplicationRequest } from './use_application_data';
import { useApplicationData } from './use_application_data';
import { useEnvironment } from './use_environment';
import { useTimeRange } from './use_time_range';

jest.mock('./use_api_client');
jest.mock('./use_environment');
jest.mock('./use_time_range', () => {
  return {
    ...jest.requireActual('./use_time_range'),
    useTimeRange: jest.fn(),
  };
});

const RESPONSE: ApplicationErrorsResponse = {
  serviceName: 'shop',
  errors: [],
  hasMoreErrors: false,
  environments: ['production'],
};

const timeRange = { rangeFrom: '2021-01-18T12:00:00.000Z', rangeTo: '2021-01-18T13:00:00.000Z' };
const fetch = jest.fn();

const errorsRequest: ApplicationRequest<ApplicationErrorsResponse> = (apiClient, options) => {
  return apiClient.fetch(
    'GET /internal/digital_experience/applications/{serviceName}/errors',
    options
  );
};

const useErrors = (serviceName: string) => {
  return useApplicationData(serviceName, errorsRequest);
};

beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockResolvedValue(RESPONSE);
  jest
    .mocked(useApiClient)
    .mockReturnValue({ fetch } as unknown as ReturnType<typeof useApiClient>);
  jest
    .mocked(useEnvironment)
    .mockReturnValue({ environment: 'production', setEnvironment: jest.fn() });
  jest
    .mocked(useTimeRange)
    .mockReturnValue({ timeRange, isTimeRangeInUrl: true, setTimeRange: jest.fn() });
});

describe('useApplicationData', () => {
  it('requests the data of the application in the time range and environment', async () => {
    const { result } = renderHook(() => {
      return useErrors('shop');
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => {
      expect(result.current.response).toEqual(RESPONSE);
    });
    expect(result.current.isLoading).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      'GET /internal/digital_experience/applications/{serviceName}/errors',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        params: {
          path: { serviceName: 'shop' },
          query: { start: timeRange.rangeFrom, end: timeRange.rangeTo, environment: 'production' },
        },
      })
    );
  });

  it('returns the error of a failed request, without a response', async () => {
    fetch.mockRejectedValue(new Error('Internal Server Error'));

    const { result } = renderHook(() => {
      return useErrors('shop');
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('Internal Server Error');
    });
    expect(result.current.response).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears the response of another application while the next one loads', async () => {
    const { result, rerender } = renderHook(
      ({ serviceName }: { serviceName: string }) => {
        return useErrors(serviceName);
      },
      { initialProps: { serviceName: 'shop' } }
    );
    await waitFor(() => {
      expect(result.current.response).toEqual(RESPONSE);
    });
    fetch.mockReturnValue(new Promise(() => {}));

    rerender({ serviceName: 'docs' });

    await waitFor(() => {
      expect(result.current.response).toBeUndefined();
    });
    expect(result.current.isLoading).toBe(true);
  });
});
