/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { waitFor, renderHook } from '@testing-library/react';
import { TestProvidersWithPrivileges } from '../../../../common/mock';
import { useSignalIndex } from './use_signal_index';
import * as api from './api';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { sourcererSelectors } from '../../../../common/store';
import { signalIndexNameSelector } from '../../../../data_view_manager/redux/selectors';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/components/user_privileges/endpoint/use_endpoint_privileges');
jest.mock('../../../../timelines/components/timeline/tabs/esql');
jest.mock('../../../../data_view_manager/redux/selectors');

describe('useSignalIndex', () => {
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
    jest.spyOn(sourcererSelectors, 'signalIndexName').mockReturnValue(null);
  });

  test('init', async () => {
    const { result } = renderHook(() => useSignalIndex(), {
      wrapper: TestProvidersWithPrivileges,
    });

    expect(result.current).toEqual({
      loading: false,
      signalIndexExists: null,
      signalIndexName: null,
    });
  });

  test('fetch alerts info', async () => {
    const { result } = renderHook(() => useSignalIndex(), {
      wrapper: TestProvidersWithPrivileges,
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current).toEqual({
        loading: false,
        signalIndexExists: true,
        signalIndexName: 'mock-signal-index',
      });
    });
  });

  test('if there is an error when fetching alerts info, signalIndexExists === false && signalIndexName == null', async () => {
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex');
    spyOnGetSignalIndex.mockImplementation(() => {
      throw new Error('Something went wrong, let see what happen');
    });
    const { result } = renderHook(() => useSignalIndex(), {
      wrapper: TestProvidersWithPrivileges,
    });

    await waitFor(() =>
      expect(result.current).toEqual({
        loading: false,
        signalIndexExists: false,
        signalIndexName: null,
      })
    );
  });

  test('should not make API calls when signal index already stored in sourcerer', async () => {
    const spyOnGetSignalIndex = jest.spyOn(api, 'getSignalIndex');
    jest
      .spyOn(sourcererSelectors, 'signalIndexName')
      .mockReturnValue('mock-signal-index-from-sourcerer');
    jest.mocked(signalIndexNameSelector).mockReturnValue('mock-signal-index-from-sourcerer');

    const { result } = renderHook(() => useSignalIndex(), {
      wrapper: TestProvidersWithPrivileges,
    });

    await waitFor(() => {
      expect(spyOnGetSignalIndex).not.toHaveBeenCalled();
      expect(result.current).toEqual({
        loading: false,
        signalIndexExists: true,
        signalIndexName: 'mock-signal-index-from-sourcerer',
      });
    });
  });
});
