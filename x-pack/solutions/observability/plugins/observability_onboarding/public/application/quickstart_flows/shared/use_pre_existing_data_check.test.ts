/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { usePreExistingDataCheck } from './use_pre_existing_data_check';

jest.mock('../../../hooks/use_fetcher', () => ({
  ...jest.requireActual('../../../hooks/use_fetcher'),
  useFetcher: jest.fn(),
}));

const mockUseFetcher = useFetcher as jest.MockedFunction<typeof useFetcher>;

const requestQueryFor = (options: Parameters<typeof usePreExistingDataCheck>[0]) => {
  mockUseFetcher.mockReturnValue({
    data: undefined,
    status: FETCH_STATUS.LOADING,
    refetch: jest.fn(),
  });
  renderHook(() => usePreExistingDataCheck(options));

  const callApi = jest.fn();
  mockUseFetcher.mock.calls[0][0](callApi);
  const [, { params }] = callApi.mock.calls[0];
  return params.query;
};

describe('usePreExistingDataCheck', () => {
  beforeEach(() => {
    mockUseFetcher.mockReset();
  });

  it('sends the OS to the otel_host probe so data from other operating systems is ignored', () => {
    expect(requestQueryFor({ flow: 'otel_host', osType: 'darwin' })).toEqual({
      start: expect.any(String),
      osType: 'darwin',
    });
  });
});
