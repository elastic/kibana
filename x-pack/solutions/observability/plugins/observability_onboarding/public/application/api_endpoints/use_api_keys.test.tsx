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
import { useApiKeys } from './use_api_keys';

jest.mock('../../hooks/use_kibana', () => ({ useKibana: jest.fn() }));
jest.mock('../../services/rest/create_call_api', () => ({
  callObservabilityOnboardingApi: jest.fn(),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockCallApi = callObservabilityOnboardingApi as jest.Mock;
const addSuccess = jest.fn();
const addError = jest.fn();

const createKeyResponse = {
  encodedApiKey: 'encoded-key',
  apiKeyId: 'key-1',
  verificationId: 'obs-onb-1',
  detectionActive: true,
};

describe('useApiKeys', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: { notifications: { toasts: { addSuccess, addError } } },
    });
  });

  it('stores full verification state and shows one success toast', async () => {
    mockCallApi.mockResolvedValue(createKeyResponse);

    const { result } = renderHook(() => useApiKeys());
    await act(async () => {
      await result.current.createApiKey(ApiEndpointId.Elasticsearch);
    });

    expect(result.current.keys[ApiEndpointId.Elasticsearch]).toEqual({
      encodedApiKey: 'encoded-key',
      apiKeyId: 'key-1',
      verificationId: 'obs-onb-1',
      status: 'waiting',
      detectionActive: true,
    });
    expect(addSuccess).toHaveBeenCalledTimes(1);
    expect(addError).not.toHaveBeenCalled();
  });

  it('setVerification updates the status of an existing key', async () => {
    mockCallApi.mockResolvedValue(createKeyResponse);

    const { result } = renderHook(() => useApiKeys());
    await act(async () => {
      await result.current.createApiKey(ApiEndpointId.Elasticsearch);
    });
    act(() => {
      result.current.setVerification(ApiEndpointId.Elasticsearch, { status: 'accepted' });
    });

    expect(result.current.keys[ApiEndpointId.Elasticsearch]?.status).toBe('accepted');
  });

  it('setVerification preserves existing key fields while updating status', async () => {
    mockCallApi.mockResolvedValue(createKeyResponse);

    const { result } = renderHook(() => useApiKeys());
    await act(async () => {
      await result.current.createApiKey(ApiEndpointId.Elasticsearch);
    });
    act(() => {
      result.current.setVerification(ApiEndpointId.Elasticsearch, { status: 'expired' });
    });

    expect(result.current.keys[ApiEndpointId.Elasticsearch]).toEqual({
      encodedApiKey: 'encoded-key',
      apiKeyId: 'key-1',
      verificationId: 'obs-onb-1',
      status: 'expired',
      detectionActive: true,
    });
  });

  it('setVerification for an endpoint with no existing key leaves keys unchanged', () => {
    const { result } = renderHook(() => useApiKeys());

    act(() => {
      result.current.setVerification(ApiEndpointId.Elasticsearch, { status: 'accepted' });
    });

    expect(result.current.keys).toEqual({});
  });

  it('shows the error toast when creation fails', async () => {
    mockCallApi.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useApiKeys());
    await act(async () => {
      await result.current.createApiKey(ApiEndpointId.Elasticsearch);
    });
    expect(addError).toHaveBeenCalledTimes(1);
    expect(addSuccess).not.toHaveBeenCalled();
    expect(result.current.keys[ApiEndpointId.Elasticsearch]).toBeUndefined();
  });

  it('keeps setVerification callback identity stable across rerender', () => {
    const { result, rerender } = renderHook(() => useApiKeys());
    const initialSetVerification = result.current.setVerification;

    rerender();

    expect(result.current.setVerification).toBe(initialSetVerification);
  });
});
