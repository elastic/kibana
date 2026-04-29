/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactQueryHookRenderer } from '../../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { useQuery as _useQuery } from '@kbn/react-query';
import { useGetTrustedDeviceSuggestions } from './use_get_trusted_device_suggestions';
import { TrustedDevicesApiClient } from '../service/api_client';

jest.mock('@kbn/react-query', () => {
  const actualReactQueryModule = jest.requireActual('@kbn/react-query');
  return {
    ...actualReactQueryModule,
    useQuery: jest.fn((...args) => actualReactQueryModule.useQuery(...args)),
  };
});

jest.mock('../service/api_client');

const useQueryMock = _useQuery as jest.Mock;

describe('useGetTrustedDeviceSuggestions', () => {
  let renderReactQueryHook: ReactQueryHookRenderer<
    Parameters<typeof useGetTrustedDeviceSuggestions>,
    ReturnType<typeof useGetTrustedDeviceSuggestions>
  >;
  let apiClientMock: jest.Mocked<TrustedDevicesApiClient>;

  beforeEach(() => {
    const testContext = createAppRootMockRenderer();

    renderReactQueryHook = testContext.renderReactQueryHook as typeof renderReactQueryHook;

    apiClientMock = {
      getSuggestions: jest.fn(),
    } as unknown as jest.Mocked<TrustedDevicesApiClient>;

    (TrustedDevicesApiClient as unknown as jest.Mock).mockImplementation(() => apiClientMock);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call useQuery with correct parameters', async () => {
    const field = 'device.serial_number';
    const query = 'test';

    apiClientMock.getSuggestions.mockResolvedValue([]);

    await renderReactQueryHook(() =>
      useGetTrustedDeviceSuggestions({
        field,
        query,
        enabled: true,
      })
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['trustedDevices', 'suggestions', field, query],
        enabled: true,
      })
    );
  });

  it('should be disabled when field is empty', async () => {
    apiClientMock.getSuggestions.mockResolvedValue([]);

    await renderReactQueryHook(
      () =>
        useGetTrustedDeviceSuggestions({
          field: '',
          enabled: true,
        }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('should be disabled when enabled is false', async () => {
    apiClientMock.getSuggestions.mockResolvedValue([]);

    await renderReactQueryHook(
      () =>
        useGetTrustedDeviceSuggestions({
          field: 'device.serial_number',
          enabled: false,
        }),
      false
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('should use empty string as default query', async () => {
    const field = 'device.vendor.id';

    apiClientMock.getSuggestions.mockResolvedValue([]);

    await renderReactQueryHook(() =>
      useGetTrustedDeviceSuggestions({
        field,
      })
    );

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['trustedDevices', 'suggestions', field, ''],
      })
    );
  });

  it('should call API client with correct parameters when queryFn is executed', async () => {
    const field = 'device.product.name';
    const query = 'USB';
    const mockSuggestions = ['USB Device 1', 'USB Device 2'];

    apiClientMock.getSuggestions.mockResolvedValue(mockSuggestions);

    const result = await renderReactQueryHook(() =>
      useGetTrustedDeviceSuggestions({
        field,
        query,
      })
    );

    expect(apiClientMock.getSuggestions).toHaveBeenCalledWith({
      field,
      query,
    });
    expect(result.data).toEqual(mockSuggestions);
  });

  it('should handle API errors gracefully', async () => {
    const field = 'device.serial_number';
    const error = new Error('API Error');

    apiClientMock.getSuggestions.mockRejectedValue(error);

    const result = await renderReactQueryHook(
      () =>
        useGetTrustedDeviceSuggestions({
          field,
        }),
      'isError'
    );

    expect(result.error).toBeTruthy();
  });

  it('should update query key when field changes', async () => {
    const initialField = 'device.serial_number';

    apiClientMock.getSuggestions.mockResolvedValue([]);

    await renderReactQueryHook(() => useGetTrustedDeviceSuggestions({ field: initialField }));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['trustedDevices', 'suggestions', initialField, ''],
      })
    );

    const updatedField = 'device.vendor.id';

    await renderReactQueryHook(() => useGetTrustedDeviceSuggestions({ field: updatedField }));

    expect(useQueryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ['trustedDevices', 'suggestions', updatedField, ''],
      })
    );
  });
});
