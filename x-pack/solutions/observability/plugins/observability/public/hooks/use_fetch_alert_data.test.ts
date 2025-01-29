/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { kibanaStartMock } from '../utils/kibana_react.mock';
import { useFetchAlertData } from './use_fetch_alert_data';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();

jest.mock('../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

describe('useFetchAlertData', () => {
  const testIds = ['123'];

  beforeEach(() => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => ({
      hits: {
        hits: [
          {
            _id: '123',
            _index: 'index',
            _source: {
              testField: 'test',
            },
          },
        ],
      },
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially is loading and does not have data', async () => {
    const { result } = renderHook(() => useFetchAlertData(testIds));

    expect(result.current).toEqual([true, {}]);
  });

  it('returns no data when an error occurs', async () => {
    mockUseKibanaReturnValue.services.http.post.mockImplementation(async () => {
      throw new Error('an http error');
    });

    const { result } = renderHook(() => useFetchAlertData(testIds));

    await waitFor(() => expect(result.current).toEqual([false, {}]));
  });

  it('retrieves the alert data', async () => {
    const { result } = renderHook(() => useFetchAlertData(testIds));

    await waitFor(() =>
      expect(result.current).toEqual([
        false,
        { '123': { _id: '123', _index: 'index', testField: 'test' } },
      ])
    );
  });

  it('does not populate the results when the request is canceled', async () => {
    const { result, unmount } = renderHook(() => useFetchAlertData(testIds));

    act(() => {
      unmount();
    });

    // unmounting the component should cancels the request in flight,
    // and as such the loading value would actually be true since not the request is not resolved
    expect(result.current).toEqual([true, {}]);
  });
});
