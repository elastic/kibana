/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { useKibana } from '../../hooks/use_kibana';
import { callObservabilityOnboardingApi } from '../../services/rest/create_call_api';
import { ApiEndpointId } from '../../../common/api_endpoints';
import { useVerificationPolling } from './use_verification_polling';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../services/rest/create_call_api', () => ({
  callObservabilityOnboardingApi: jest.fn(),
}));

const addSuccess = jest.fn();
const mockCallApi = callObservabilityOnboardingApi as jest.Mock;
const mockUseKibana = useKibana as jest.Mock;

const defaultParams = {
  endpointId: ApiEndpointId.Elasticsearch,
  verificationId: 'obs-onb-1',
  status: 'waiting' as const,
  detectionActive: true,
  endpointLabel: 'Elasticsearch',
};

const advancePollInterval = async (times = 1) => {
  for (let i = 0; i < times; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
    });
  }
};

describe('useVerificationPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseKibana.mockReturnValue({
      services: { notifications: { toasts: { addSuccess } } },
    });
  });
  afterEach(() => jest.useRealTimers());

  it('polls while waiting and reports accepted with a toast', async () => {
    mockCallApi
      .mockResolvedValueOnce({ status: 'waiting', detectionActive: true })
      .mockResolvedValueOnce({ status: 'accepted', detectionActive: true, lastSeen: 'ts' });
    const onStatus = jest.fn();

    const { unmount } = renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        onStatus,
      })
    );

    await advancePollInterval(2);

    expect(onStatus).toHaveBeenCalledWith(ApiEndpointId.Elasticsearch, {
      status: 'accepted',
      signal: undefined,
      lastSeen: 'ts',
    });
    expect(addSuccess).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
  });

  it('reports expired from the server, stops polling, and does not toast', async () => {
    mockCallApi.mockResolvedValueOnce({ status: 'expired', detectionActive: false });
    const onStatus = jest.fn();

    const { unmount } = renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        onStatus,
      })
    );

    await advancePollInterval();

    expect(onStatus).toHaveBeenCalledWith(ApiEndpointId.Elasticsearch, {
      status: 'expired',
      signal: undefined,
      lastSeen: undefined,
    });
    expect(addSuccess).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(mockCallApi).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
  });

  it('expires after the max poll cap and stops polling', async () => {
    mockCallApi.mockResolvedValue({ status: 'waiting', detectionActive: true });
    const onStatus = jest.fn();

    const { unmount } = renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        onStatus,
      })
    );

    await advancePollInterval(100);

    expect(mockCallApi).toHaveBeenCalledTimes(100);
    expect(onStatus).not.toHaveBeenCalled();

    await advancePollInterval();

    expect(onStatus).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith(ApiEndpointId.Elasticsearch, { status: 'expired' });
    expect(mockCallApi).toHaveBeenCalledTimes(100);

    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(mockCallApi).toHaveBeenCalledTimes(100);

    act(() => {
      unmount();
    });
  });

  it('ignores poll errors and continues until accepted', async () => {
    mockCallApi
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 'accepted', detectionActive: true, lastSeen: 'ts' });
    const onStatus = jest.fn();

    const { unmount } = renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        onStatus,
      })
    );

    await advancePollInterval(2);

    expect(onStatus).toHaveBeenCalledWith(ApiEndpointId.Elasticsearch, {
      status: 'accepted',
      signal: undefined,
      lastSeen: 'ts',
    });
    expect(addSuccess).toHaveBeenCalledTimes(1);

    act(() => {
      unmount();
    });
  });

  it('does not notify after unmount while a poll is in flight', async () => {
    let resolvePoll!: (value: unknown) => void;
    const pendingPoll = new Promise((resolve) => {
      resolvePoll = resolve;
    });
    mockCallApi.mockReturnValueOnce(pendingPoll);
    const onStatus = jest.fn();

    const { unmount } = renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        onStatus,
      })
    );

    await advancePollInterval();

    act(() => {
      unmount();
    });

    await act(async () => {
      resolvePoll({ status: 'accepted', detectionActive: true, lastSeen: 'ts' });
      await Promise.resolve();
    });

    expect(onStatus).not.toHaveBeenCalled();
    expect(addSuccess).not.toHaveBeenCalled();
  });

  it('does not poll when status is not waiting', () => {
    const onStatus = jest.fn();
    renderHook(() =>
      useVerificationPolling({
        endpointId: ApiEndpointId.Elasticsearch,
        verificationId: 'obs-onb-1',
        status: 'accepted',
        detectionActive: true,
        endpointLabel: 'Elasticsearch',
        onStatus,
      })
    );
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(mockCallApi).not.toHaveBeenCalled();
  });

  it('does not poll when detection is not active', () => {
    const onStatus = jest.fn();
    renderHook(() =>
      useVerificationPolling({
        ...defaultParams,
        detectionActive: false,
        onStatus,
      })
    );
    act(() => {
      jest.advanceTimersByTime(9000);
    });
    expect(mockCallApi).not.toHaveBeenCalled();
  });
});
